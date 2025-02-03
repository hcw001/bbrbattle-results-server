from units import defaultUnits, emptyUnits, Abbr, \
Artillery, AAA, StrategicBomber, AirTransport, Tank, Transport, Fighter, BattleshipBombard, Submarine, SurpriseStrikeSubmarine
from utils import isEmptyUnit, getCount, Dice, BattleBoard, getValidUnits, HitRecord, validateAssignments
from lib import PlayerState, Tech, Role, Flag, Tag, Stalemate
from config import HASAAA, PLANES, ONESHOT, ATTACK_STATIC_SUB_TARGET_ORDER, DEFENSE_STATIC_SUB_TARGET_ORDER

class Player:
    def __init__(self, role):
        self.role = role
        self.unitDict = defaultUnits(role)
        self.units = emptyUnits(self.unitDict)
        self.retreatedUnits = emptyUnits(self.unitDict)
        self.state = PlayerState.ALIVE
        self.casualties = [] #HitRecord[]
        self.tech = Tech.NONE
        self.isFirstRound = True  #trackTargetStrikes
    def check(self):
        if self.tech == Tech.SUP_BTS:
            assert self.count(Abbr.BTS, Abbr.BTSx) == 0
        else:
            assert self.count(Abbr.sBTS, Abbr.sBTSx, Abbr.sBTSxx) == 0
        if self.tech == Tech.SUP_ACC:
            assert self.count(Abbr.ACC, Abbr.ACCx) == 0
        else:
            assert self.count(Abbr.sACC, Abbr.sACCx, Abbr.sACCxx) == 0
    def __eq__(self, state):
        return self.state == state
    def count(self, *units):
        count = 0
        for unit in units:
            count += getCount(self.units[unit])
        return count
    def get(self, unit):
        return self.unitDict[unit]
    def addUnits(self, units):
        for unit in units:
            self.units[unit] = self.unitDict[unit].addUnit(self.units[unit], units[unit])
    def applyTech(self, tech):
        self.tech = tech
        #No changes on Tech.SUP_ACC
        if tech == Tech.ADV_ART:
            self.unitDict[Abbr.ART] = Artillery(self.role, tech=True)
        elif tech == Tech.ATC:
            self.unitDict[Abbr.TRIPLEA] = AAA(self.role, tech=True)
        elif tech == Tech.HEAVY_BOMB:
            self.unitDict[Abbr.STRAT] = StrategicBomber(self.role, tech=True)
            self.unitDict[Abbr.ATPT] = AirTransport(self.role, tech=True),
        elif tech == Tech.HEAVY_TANK:
            self.unitDict[Abbr.TANK] = Tank(self.role, tech=True)
        elif tech == Tech.IMP_TPT:
            self.unitDict[Abbr.TPT] = Transport(self.role, tech=True)
        elif tech == Tech.JET_FTR:
            self.unitDict[Abbr.FTR] = Fighter(self.role, tech=True)
        elif tech == Tech.SUP_BTS:
            self.unitDict[Abbr.BBOMB] = BattleshipBombard(self.role, tech=True)
        elif tech == Tech.SUP_SUB:
            self.unitDict[Abbr.SUB] = Submarine(self.role, tech=True)
            self.unitDict[Abbr.SSSUB] = SurpriseStrikeSubmarine(self.role, tech=True)
    def updateCasualtyRecord(self, record):
        self.casualties.append(record.getRecord())
    def getHasDestroyer(self):
        return True if self.count(Abbr.DTR) > 0 else False
    def getIpcValueUnits(self, units):
        ipcValue = 0
        for unit in units:
            if not isEmptyUnit(units[unit]):
                #Handle Air Transports
                if unit == Abbr.ATPT:
                    for pair in units[Abbr.ATPT]:
                        #Air Transport
                        ipcValue += self.get(Abbr.ATPT).ipc
                        for item in pair:
                            #Cargo
                            ipcValue += self.get(item).ipc
                #Handle Other Units
                else:
                    ipcValue += units[unit] * self.get(unit).ipc
        return ipcValue
    #Needs Testing
    def getDice(self):
        board = self.getBattleBoard()
        for unit in self.units:
            #Skip Surprise Strike Subs
            if unit == Abbr.SSSUB: continue
            if isEmptyUnit(self.units[unit]): continue
            board.add(self.get(unit), self.count(unit))
        return board.getDice(), board.getTags()
    def takeUnit(self, targets):
        for unit in self.orderOfLoss:
            if unit in targets and not isEmptyUnit(self.units[unit]):
                #Remove Casualty
                self.units[unit] = self.get(unit).applyHit(self.count(unit))
                if hasattr(self.get(unit), 'downgrade'):
                    #Add Damaged Unit
                    damagedUnit = self.get(unit).downgrade
                    self.units[damagedUnit] = self.get(damagedUnit).addUnit(self.count(damagedUnit), 1)
                return unit
        return None
    def takeCasualties(self, hits): #hits: Tag[] - a list of tags: tags[]
        record = HitRecord()
        for hit in hits:
            targets = getValidUnits(hit)
            choice = self.takeUnit(targets)
            #Hit Applied?
            if choice is not None:
                record.add(choice, targets)
            #Handle No Valid Target
            else:
                for i, (alloc, alts) in enumerate(record):
                    if alloc in targets:
                        realloc = self.takeUnit(alts)
                        if realloc is not None:
                            record.remove(i)
                            record.add(alloc, targets)
                            record.add(realloc, alts)
                            break
                        else: #No Alternative found
                            pass
        #All Hits Allocated - if Possible
        self.updateCasualtyRecord(record)
        del record

    def getUnitSet(self):
        return [unit for unit in self.units if not isEmptyUnit(self.units[unit])]
    def checkRetreat(self):
        units = self.getUnitSet()
        #Check if Player Alive
        if len(units) == 0: self.state = PlayerState.DEAD
        #Check for Stalemates
        if all([unit in PLANES for unit in units]): return Stalemate.PLANE
        elif len(units) == 1 and not isEmptyUnit(self.units[Abbr.SUB]): return Stalemate.SUB
        elif len(units) == 1 and self.count(Abbr.TPT) == 1: return Stalemate.LONETPT
        else: return Stalemate.NONE
    def nextRound(self):
        self.isFirstRound = False
    def rollTargetStrikes(self, assignments):
        #assignments: <[unit: string]: number[]>
        usedCount = 0
        hits = []
        for unit in assignments:
            for target in assignments[unit]:
                #Tags take individual unit names
                usedCount += target
                strikes = Dice.roll([3]*target, [unit] * target)
                if len(strikes) > 0:
                    #Handle Capital Ships
                    if hasattr(self.get(unit), 'downgrade'):
                        hits.append(strikes[0])
                        if len(strikes) > 1:
                            unitName = self.get(unit).downgrade
                            for _ in len(strikes-1):
                                #Take Downgraded Unit
                                hits.append([unitName])
                                if hasattr(self.get(unitName), 'downgrade'):
                                    unitName = self.get(unitName).downgrade
                                else:
                                    break
                    else:
                        #Regular Units
                        hits.append(strikes[0])
        return hits, usedCount
    
    def rollSurpriseStrikes(self, opponent, subCount, assignments):
        #Base Condition - Completely Allocated
        if self.isFirstRound:
            assert validateAssignments(opponent, assignments, subCount)
            return self.rollTargetStrikes(assignments)
        
        #Reassign Sub Strikes
        assignments = {}
        for unit in self.subTargetOrder:
            unitCount = opponent.count(unit)
            if unitCount > 0:
                assignments[unit] = [0]*unitCount
                for targetIdx in range(len(assignments[unit])):
                    if subCount > 0:
                        assignments[unit][targetIdx] += 1
                        subCount -= 1
                    else:
                        break
        while subCount > 0:
            for unit in assignments:
                for targetIdx in assignments[unit]:
                    if subCount > 0:
                        assignments[unit][targetIdx] += 1
                        subCount -= 1
                    else:
                        break
        return self.rollTargetStrikes(assignments)
    
class Attacker(Player):
    def __init__(self, **kwargs):
        super(Attacker, self).__init__(Role.ATTACK)
        self.applyTech(kwargs['tech'])
        self.addUnits(kwargs['units'])
        self.orderOfLoss = kwargs['orderOfLoss']
        self.subTargetOrder = ATTACK_STATIC_SUB_TARGET_ORDER
        self.check()
        self.initIpc = self.getIpcValueUnits(self.units)
    def landParatroopers(self):
        for units in self.units[Abbr.ATPT]:
            for unit in units:
                if unit is not None:
                    self.units[unit] += 1
        self.retreatedUnits[Abbr.ATPT] = [[]] * len(self.units[Abbr.ATPT])
        self.units[Abbr.ATPT] = 0
    def getBattleBoard(self):
        return BattleBoard(boosts={
            'Artillery Boost': {
                'applyTo': (Abbr.INF, Abbr.MECH),
                'count': self.get(Abbr.ART).getBoosts() * self.count(Abbr.ART)
            },
            'Tactical Boost': {
                'applyTo': (Abbr.TAC),
                'count': self.get(Abbr.TANK).getBoosts() * self.count(Abbr.TANK) \
                + self.get(Abbr.FTR).getBoosts() * self.count(Abbr.FTR)
            }
        }, hasDestroyer=self.getHasDestroyer())
    def checkRetreat(self):
        for unit in ONESHOT:
            if not isEmptyUnit(self.units[unit]):
                self.retreatedUnits[unit] += self.count(unit)
                self.units[unit] = 0
        return super().checkRetreat()
    def getDice(self):
        if self.isFirstRound:
            #Remove Target Strike Tacticals
            hold = self.count(Abbr.TSTAC)
            self.units[Abbr.TSTAC] = 0
            dice, tags = super().getDice()
            self.units[Abbr.TSTAC] = hold
            return dice, tags
        else: return super().getDice()

class Defender(Player):
    def __init__(self, **kwargs):
        super(Defender, self).__init__(Role.DEFENSE)
        self.applyTech(kwargs['tech'])
        self.addUnits(kwargs['units'])
        self.orderOfLoss = kwargs['orderOfLoss']
        self.subTargetOrder = DEFENSE_STATIC_SUB_TARGET_ORDER
        self.check()
        self.initIpc = self.getIpcValueUnits(self.units)
    def rollTripleA(self, numberOfPlanes):
        dice = []
        for unit in HASAAA:
            dice.extend(self.get(unit).getAAADice() * self.count(unit))
        if len(dice) == 0:
            return [], Flag.NOTRIPLEA
        dice = sorted(dice, reverse=True)
        dice = dice[:numberOfPlanes]
        numberOfHits = len(Dice.roll(dice))
        return [[Tag.AIRCRAFT]] * numberOfHits, Flag.HASTRIPLEA
    def getBattleBoard(self):
        return BattleBoard(boosts={
            'Cruiser Boost': {
                'applyTo': (Abbr.CSR),
                'count': sum([self.get(Bts).getBoosts() for Bts in [Abbr.BTS, Abbr.BTSx, Abbr.sBTS, Abbr.sBTSx, Abbr.sBTSxx]])
            }
        }, hasDestroyer=self.getHasDestroyer())
