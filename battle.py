from player import Attacker, Defender
from lib import Flag, PlayerState, Stalemate, Tech
from config import PLANES, SHIPUNITS, SUBUNITS
from utils import Dice
from units import Abbr

class Battle:
    def __init__(self, **kwargs):
        self.terrain = kwargs['terrain']

        #Parse Paradrops
        if (self.terrain == 'land'):
            assert kwargs['attackerUnits'][Abbr.ATPT] == len(kwargs['paradrops'])
            kwargs['attackerUnits'][Abbr.ATPT] = kwargs['paradrops']

        self.attacker = Attacker(
            tech=kwargs['attackerTech'],
            orderOfLoss=kwargs['attackerOrderOfLoss'],
            units=kwargs['attackerUnits']
        )
        self.defender = Defender(
            tech=kwargs['defenderTech'],
            orderOfLoss=kwargs['defenderOrderOfLoss'],
            units=kwargs['defenderUnits']
        )
        self.params = dict(filter(lambda item: item[0] in [
            'targetSelectAssigments',
            'attackerSubAssignments',
            'defenderSubAssignments',
        ], kwargs.items()))
    
    def handleAAA(self):
        numberOfPlanes = self.attacker.count(*PLANES)
        hits, flag = self.defender.rollTripleA(numberOfPlanes)
        self.attacker.takeCasualties(hits)
        return flag
    
    def handleTargetStrikes(self):
        assignments = self.params.get('targetSelectAssigments')
        targetedHits, usedCount = self.attacker.rollTargetStrikes(assignments)
        self.defender.takeCasualties(targetedHits)

        #Switch to TS-Tacs
        assert usedCount <= self.attacker.count(Abbr.TAC)
        self.attacker.units[Abbr.TAC] -= usedCount
        self.attacker.units[Abbr.TSTAC] += usedCount

    def numberSubmarineStrikes(self, player, opponent):
        if (self.terrain == 'land'): return 0
        if opponent.count(*SHIPUNITS, *SUBUNITS) == 0: return 0
        if (player.tech == Tech.SUP_SUB): 
            if opponent.count(Abbr.DTR) > 0: 
                return max(
                    player.count(Abbr.SUB) - opponent.count(Abbr.DTR) * 3, 0
                )
        else:
            if opponent.count(Abbr.DTR) > 0: return 0
        return player.count(Abbr.SUB)

    def handleSurpriseStrike(self):
        #handle attacker
        aSubs = self.numberSubmarineStrikes(self.attacker, self.defender)
        aSubHits = None
        if aSubs > 0:
            attackerAssignments = self.params.get('attackerSubAssignments')
            aSubHits, aSubsUsed = self.attacker.rollSurpriseStrikes(self.defender, aSubs, attackerAssignments)
            assert aSubs == aSubsUsed

        #handle defender
        dSubs = self.numberSubmarineStrikes(self.defender, self.attacker)
        dSubsHits = None
        if dSubs > 0:
            defenderAssignments = self.params.get('defenderSubAssignments')
            dSubHits, dSubsUsed = self.defender.rollSurpriseStrikes(self.attacker, dSubs, defenderAssignments)
            assert dSubs == dSubsUsed

        #apply attacker's hits
        if aSubHits is not None: self.defender.takeCasualties(aSubHits)
        #apply defender's hits
        if dSubHits is not None: self.attacker.takeCasualties(dSubHits)

        #swap attacker subs
        assert self.attacker.count(Abbr.SSSUB) == 0
        assert self.attacker.count(Abbr.SUB) >= aSubs
        self.attacker.units[Abbr.SUB] -= aSubs
        self.attacker.units[Abbr.SSSUB] += aSubs
        
        #swap defender subs
        assert self.defender.count(Abbr.SSSUB) == 0
        assert self.defender.count(Abbr.SUB) >= dSubs
        self.defender.units[Abbr.SUB] -= dSubs
        self.defender.units[Abbr.SSSUB] += dSubs
        
    def revertSurpriseStrikeSubs(self):
        #Attacker
        aSubs = self.attacker.count(Abbr.SSSUB)
        self.attacker.units[Abbr.SSSUB] -= aSubs
        self.attacker.units[Abbr.SUB] += aSubs
        #Defender
        dSubs = self.defender.count(Abbr.SSSUB)
        self.defender.units[Abbr.SSSUB] -= dSubs
        self.defender.units[Abbr.SUB] += dSubs
    
    def run(self):
        flag = self.handleAAA()
        if flag == Flag.NOTRIPLEA:
            self.handleTargetStrikes()
        self.attacker.landParatroopers()
        #Check Alive
        while self.defender == PlayerState.ALIVE and self.attacker == PlayerState.ALIVE:
            #Submarine Warfare
            self.handleSurpriseStrike()
            #Main Combat
            attackerHits = Dice.roll(self.attacker.getDice())
            defenderHits = Dice.roll(self.defender.getDice())
            self.revertSurpriseStrikeSubs() #Don't Handle Taking SSSUBs in Casualty Logic
            self.defender.takeCasualties(attackerHits)
            self.attacker.takeCasualties(defenderHits)
            #Check Retreat - Adjust Player States
            conditions = set(self.attacker.checkRetreat(), self.defender.checkRetreat())
            if self.checkEarlyTermination(conditions): break
        return self
    
    def dump(self):
        return {
            'attacker': {
                'ipc': 0,
                'alive': {},
                'dead': {}
            },
            'defender': {
                'ipc': 0,
                'alive': {},
                'dead': {}
            },
            'flag': self.attacker.state - self.defender.state
        }
    
    def checkEarlyTermination(self, conditions):
        if Stalemate.NONE in conditions: return False
        if Stalemate.PLANE in conditions and Stalemate.SUB in conditions: return True
        if len(conditions) == 1 and Stalemate.LONETPT in conditions:
            if any(TPT.tech for TPT in [self.attacker.get(Abbr.TPT), self.defender.get(Abbr.TPT)]): return False
            else: return True
        return False
    
    #Handle target strikes
    #Keep track of casualties -> track IPC
    #Sub warfare -- handle no fire subs
    #Take Land Flag -- UI
    #Hash for dictionary to count outcomes?
    #Store attack history in database