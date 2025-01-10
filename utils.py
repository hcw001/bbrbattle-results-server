import math
import random
from units import Abbr
from lib import Tag
from config import PLANES, LANDUNITS, SHIPUNITS, SUBUNITS

class Dice():
    def __new__(cls, *args, **kwargs):
        return cls
    def roll(dice, tags):
        hits = []
        for i, die in enumerate(dice):
            if die <= (math.floor(random.random() * 6) + 1):
                hits.append(tags[i])
        return hits
    
def isEmptyUnit(amount):
    if isinstance(amount, list):
        return True if len(amount) == 0 else False
    return True if amount == 0 else False

def getCount(unitCount):
    if isinstance(unitCount, list):
        return len(unitCount)
    else:
        return unitCount
    
def getValidUnits(tags):
    valid = set()
    for tag in tags:
        if tag == Tag.SHIPUNITS:
            valid.update(SHIPUNITS)
        elif tag == Tag.LANDUNITS:
            valid.update(LANDUNITS)
        elif tag == Tag.AIRCRAFT:
            valid.update(PLANES)
        elif tag == Tag.SUB:
            valid.update(SUBUNITS)
        else:
            #raise ValueError("Unexpected Tag Encountered.")
            assert len(tags) == 1
            assert tag in Abbr
            valid.update(tag)
    return list(valid)
    
class BattleBoard:
    def __init__(self, boosts, hasDestroyer):
        self.boosts = boosts
        self.hasDestroyer = hasDestroyer
        self.dice = []
        self.tags = []
    def add(self, unit, count):
        dice = None
        for boost in self.boosts:
            if unit.__class__.__name__ in self.boosts[boost]['applyTo']:
                usedBuffs = min(self.boosts[boost]['count'], count)
                dice = unit.getDice(1) * usedBuffs
                dice.extend(unit.getDice() * (count - usedBuffs))
                self.boosts[boost]['count'] -= usedBuffs
        if dice is None:
            if unit.__class__.__name__ == Abbr.TPT:
                dice = unit.getDice() * (count // 2)
                if (count %2 ==  1): dice.append(unit.getDice()[0])
            else:
                dice = unit.getDice() * count
        tags = unit.getTags(hasDestroyer=self.hasDestroyer) * len(dice)
        self.dice.extend(dice)
        self.tags.extend(tags)
    def getDice(self): return self.dice
    def getTags(self): return self.tags

class HitRecord:
    def __init__(self):
        self.record = [] #(choice: (unit: string), alt: (units: string[]))
    def __iter__(self): return iter(self.record)
    def add(self, choice, targets):
        self.record.append((choice, targets))
    def remove(self, index):
        self.record.pop(index)
    