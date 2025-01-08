from abc import ABC, abstractmethod
from types import Tag, Role
from enum import Enum

def getRoll(side, values):
    attack, defense = values
    if side == Role.ATTACK: roll = attack
    elif side == Role.DEFENSE: roll = defense
    return roll


class Unit(ABC):
    def __init__(self, roll, ipc):
        self.roll = roll
        self.ipc = ipc
    def initialize(self):
        return 0
    def addUnit(self, previousUnits, newUnits):
        return previousUnits + newUnits
    def getDice(self, buff=0):
        return [self.roll + buff]
    def getBoosts(self):
        return 1
    def applyHit(self, units):
        return units - 1
    def getAAADice(self):
        return []
    @abstractmethod
    def getTags(self, **kwargs):
        pass

###LAND UNITS###
class Infantry(Unit):
    def __init__(self, side):
        roll = getRoll(side, (1,2))
        super().__init__(roll=roll, ipc=3)
    def getTags(self, **kwargs):
        return [Tag.LANDUNITS, Tag.AIRCRAFT]

class Artillery(Unit):
    def __init__(self, side, tech=False):
        super().__init__(roll=2, ipc=4)
        self.tech = tech
    def getBoosts(self):
        return 2 if self.tech else 1
    def getTags(self, **kwargs):
        return [Tag.LANDUNITS, Tag.AIRCRAFT]
    
class Cavalry(Unit):
    def __init__(self, side):
        roll = getRoll(side, (2,1))
        super().__init__(roll=roll, ipc=4)
    def getTags(self, **kwargs):
        return [Tag.LANDUNITS, Tag.AIRCRAFT]

class MechanizedInfantry(Unit):
    def __init__(self, side):
        roll = getRoll(side, (1,2))
        super().__init__(roll=roll, ipc=4)
    def getTags(self, **kwargs):
        return [Tag.LANDUNITS, Tag.AIRCRAFT]

class Tank(Unit):
    def __init__(self, side, tech=False):
        if tech: roll = getRoll(side, (4,3))
        else: roll = 3
        super().__init__(roll=roll, ipc=6)
    def getTags(self, **kwargs):
        return [Tag.LANDUNITS, Tag.AIRCRAFT]

class AAA(Unit):
    def __init__(self, side, tech=False):
        if tech: self.AAA = 2
        else: self.AAA = 1
        super().__init__(roll=0, ipc=5)
    def getDice(self, buff=0):
        return []
    def getAAADice(self):
        return [self.AAA] * 3
    def getTags(self, **kwargs):
        return [Tag.AIRCRAFT]

###PLANES###
class Fighter(Unit):
    def __init__(self, side, tech=False):
        if tech: roll = 4
        else: roll = getRoll(side, (3,4))
        super().__init__(roll=roll, ipc=10)
    def getTags(self, **kwargs):
        tags = [Tag.LANDUNITS, Tag.SHIPUNITS, Tag.AIRCRAFT]
        if kwargs['hasDestroyer']:
            tags.append(Tag.SUB)
        return tags

class TacticalBomber(Unit):
    def __init__(self, side):
        super().__init__(roll=3, ipc=11)
    def getTags(self, **kwargs):
        tags = [Tag.LANDUNITS, Tag.SHIPUNITS, Tag.AIRCRAFT]
        if kwargs['hasDestroyer']:
            tags.append(Tag.SUB)
        return tags

class TargetStrikeTacticalBomber(Unit):
    def __init__(self, side):
        super().__init__(roll=3, ipc=11)
    def getTags(self, **kwargs):
        tags = [Tag.LANDUNITS, Tag.SHIPUNITS, Tag.AIRCRAFT]
        if kwargs['hasDestroyer']:
            tags.append(Tag.SUB)
        return tags

class StrategicBomber(Unit):
    def __init__(self, side, tech=False):
        if tech: roll = getRoll(side, ([3,3],[1]))
        else: roll = getRoll(side, ([2,2],[1]))
        super().__init__(roll=roll, ipc=12)
    def getDice(self, buff=0):
        return self.roll
    def getTags(self, **kwargs):
        tags = [Tag.LANDUNITS, Tag.SHIPUNITS, Tag.AIRCRAFT]
        if kwargs['hasDestroyer']:
            tags.append(Tag.SUB)
        return tags

class AirTransport(Unit):
    def __init__(self, side, tech=False):
        super().__init__(roll=0, ipc=12)
    def initialize(self):
        return []
    def getDice(self, buff=0):
        return []
    def addUnit(self, previousUnits, newUnits):
        units = previousUnits.append(newUnits)
        return units
    def applyHit(self, units):
        units.pop(0)
        return units
    def getTags(self, **kwargs):
        pass

###BOMBDARDS###
class BattleshipBombard(Unit):
    def __init__(self, side, tech=False):
        if tech: roll = [4,2]
        else: roll = [4]
        super().__init__(roll=roll, ipc=20)
    def getDice(self, buff=0):
        return self.roll
    def getTags(self, **kwargs):
        return [Tag.LANDUNITS, Tag.AIRCRAFT]

class CruiserBombard(Unit):
    def __init__(self, side):
        super().__init__(roll=3, ipc=12)
    def getTags(self, **kwargs):
        return [Tag.LANDUNITS, Tag.AIRCRAFT]

###SHIPS###
class Cruiser(Unit):
    def __init__(self, side):
        super().__init__(roll=3, ipc=12)
    def getAAADice(self):
        return [1]
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class Submarine(Unit):
    def __init__(self, side, tech=False):
        if tech: roll = getRoll(side, (3,1))
        else: roll = getRoll(side, (2,1))
        super().__init__(roll=roll, ipc=6)
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.SUB]

class Destroyer(Unit):
    def __init__(self, side):
        super().__init__(roll=2, ipc=8)
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class Transport(Unit):
    def __init__(self, side, tech=False):
        if tech: roll = getRoll(side, ([0,0], [1,1]))
        else: roll = getRoll(side, ([0,0], [0,1]))
        super().__init__(roll=roll, ipc=7)
    def getDice(self, buff=0):
        return self.roll
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

###CAPITAL SHIPS###
class Battleship(Unit):
    def __init__(self, side):
        super().__init__(roll=4, ipc=20)
        self.AAA = 1
        self.downgrade = DamagedBattleship.__name__
    def getAAADice(self):
        return [self.AAA] * 3
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]


class DamagedBattleship(Unit):
    def __init__(self, side):
        super().__init__(roll=2, ipc=20)
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class SuperBattleship(Unit):
    def __init__(self, side):
        super().__init__(roll=[4,2], ipc=20)
        self.AAA = 2
        self.downgrade = SuperBattleshipX.__name__
    def getDice(self, buff=0):
        return self.roll
    def getAAADice(self):
        return [self.AAA] * 3
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class SuperBattleshipX(Unit):
    def __init__(self, side):
        super().__init__(roll=[4,2], ipc=20)
        self.AAA = 2
        self.downgrade = DamagedSuperBattleship.__name__
    def getDice(self, buff=0):
        return self.roll
    def getAAADice(self):
        return [self.AAA] * 3
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class DamagedSuperBattleship(Unit):
    def __init__(self, side):
        super().__init__(roll=[2,1], ipc=20)
    def getDice(self, buff=0):
        return self.roll
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class AircraftCarrier(Unit):
    def __init__(self, side):
        roll = getRoll(side, (0,2))
        super().__init__(roll=roll, ipc=16)
        self.downgrade = DamagedAircraftCarrier.__name__
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class DamagedAircraftCarrier(Unit):
    def __init__(self, side):
        roll = getRoll(side, (0,1))
        super().__init__(roll=roll, ipc=16)
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class SuperAircraftCarrier(Unit):
    def __init__(self, side):
        roll = getRoll(side, (0,2))
        super().__init__(roll=roll, ipc=16)
        self.downgrade = SuperAircraftCarrierX.__name__
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class SuperAircraftCarrierX(Unit):
    def __init__(self, side):
        roll = getRoll(side, (0,1))
        super().__init__(roll=roll, ipc=16)
        self.downgrade = DamagedSuperAircraftCarrier.__name__
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class DamagedSuperAircraftCarrier(Unit):
    def __init__(self, side):
        roll = getRoll(side, (0,1))
        super().__init__(roll=roll, ipc=16)
    def getTags(self, **kwargs):
        return [Tag.SHIPUNITS, Tag.AIRCRAFT, Tag.SUB]

class Abbr(Enum):
    TRIPLEA = AAA.__name__
    ART = Artillery.__name__
    CAV = Cavalry.__name__
    FTR = Fighter.__name__
    INF = Infantry.__name__
    MECH = MechanizedInfantry.__name__
    STRAT = StrategicBomber.__name__
    TAC = TacticalBomber.__name__
    TANK = Tank.__name__
    ATPT = AirTransport.__name__
    CBOMB = CruiserBombard.__name__
    BBOMB = BattleshipBombard.__name__
    TSTAC = TargetStrikeTacticalBomber.__name__

    CSR = Cruiser.__name__
    BTS = Battleship.__name__
    SUB = Submarine.__name__
    DTR = Destroyer.__name__
    ACC = AircraftCarrier.__name__
    TPT = Transport.__name__

    BTSx = DamagedBattleship.__name__
    sBTS = SuperBattleship.__name__
    sBTSx = SuperBattleshipX.__name__
    sBTSxx = DamagedSuperBattleship.__name__

    ACCx = DamagedAircraftCarrier.__name__
    sACC = SuperAircraftCarrier.__name__
    sACCx = SuperAircraftCarrierX.__name__
    sACCxx = DamagedSuperAircraftCarrier.__name__

def defaultUnits(role):
    return {
        #Land
        Abbr.TRIPLEA: AAA(role),
        Abbr.ART: Artillery(role),
        Abbr.CAV: Cavalry(role),
        Abbr.FTR: Fighter(role),
        Abbr.INF: Infantry(role),
        Abbr.MECH: MechanizedInfantry(role),
        Abbr.STRAT: StrategicBomber(role),
        Abbr.TAC: TacticalBomber(role),
        Abbr.TSTAC: TargetStrikeTacticalBomber(role),
        Abbr.TANK: Tank(role),
        Abbr.ATPT: AirTransport(role),
        Abbr.CBOMB: CruiserBombard(role),
        Abbr.BBOMB: BattleshipBombard(role),
        #Ships
        Abbr.TPT: Transport(role),
        Abbr.SUB: Submarine(role),
        Abbr.DTR: Destroyer(role),
        Abbr.CSR: Cruiser(role),
        #Capital Ships
        Abbr.BTS: Battleship(role),
        Abbr.BTSx: DamagedBattleship(role),
        Abbr.ACC: AircraftCarrier(role),
        Abbr.ACCx: DamagedAircraftCarrier(role),
        #Super Capital Ships
        Abbr.sBTS: SuperBattleship(role),
        Abbr.sBTSx: SuperBattleshipX(role),
        Abbr.sBTSxx: DamagedSuperBattleship(role),
        Abbr.sACC: SuperAircraftCarrier(role),
        Abbr.sACCx: SuperAircraftCarrierX(role),
        Abbr.sACCxx: DamagedSuperAircraftCarrier(role)
    }

def emptyUnits(unitDict):
    troops = {}
    for troop in unitDict:
        troops[troop] = unitDict[troop].initialize()
    return troops