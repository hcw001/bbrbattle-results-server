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
    ADV_ART = 1
    ATC = 2
    HEAVY_BOMB = 3
    HEAVY_TANK = 4
    IMP_TPT = 5
    JET_FTR = 6
    SUP_BTS = 7
    SUP_ACC = 8
    SUP_SUB = 9
    
class Stalemate(Enum):
    PLANE = 1
    SUB = 2
    LONETPT = 3
    NONE = 4