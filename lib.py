from enum import Enum

class Tag(Enum):
    SHIPUNITS = 1
    LANDUNITS = 2
    AIRCRAFT = 3
    SUB = 4

class Role(Enum):
    ATTACK = 1
    DEFENSE = 2

class PlayerState(Enum):
    DEAD = 1
    ALIVE = 2

class EndCondition(Enum):
    ATTACKER_WIN = 1
    DEFENDER_WIN = 2
    DRAW = 3

class Flag(Enum):
    NOTRIPLEA = 1
    HASTRIPLEA = 2

class Tech(Enum):
    ADV_ART = 0
    ATC = 1
    HEAVY_BOMB = 2
    HEAVY_TANK = 3
    JET_FTR = 4
    SUP_BTS = 5
    SUP_SUB = 6
    SUP_ACC = 7
    IMP_TPT = 8
    NONE = 9
    
class Stalemate(Enum):
    PLANE = 1
    SUB = 2
    LONETPT = 3
    NONE = 4