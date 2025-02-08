from enum import Enum

class CustomEnum(Enum):

    def __get__(self, instance, owner):
        return self.value
    

class Tag(CustomEnum):
    SHIPUNITS = 1
    LANDUNITS = 2
    AIRCRAFT = 3
    SUB = 4

class Role(CustomEnum):
    ATTACK = 1
    DEFENSE = 2

class PlayerState(CustomEnum):
    DEAD = 1
    ALIVE = 2

class EndCondition(CustomEnum):
    ATTACKER_WIN = 0
    DEFENDER_WIN = 1
    DRAW = 2
    STALEMATE = 3

class Flag(CustomEnum):
    NOTRIPLEA = 1
    HASTRIPLEA = 2

class Tech(CustomEnum):
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
    
class Stalemate(CustomEnum):
    PLANE = 1
    SUB = 2
    LONETPT = 3
    NONE = 4