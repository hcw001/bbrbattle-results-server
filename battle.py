from player import Attacker, Defender
from lib import Flag, PlayerState, Stalemate
from config import PLANES
from utils import Dice
from units import Abbr

class Battle:
    def __init__(self, **kwargs):
        self.terrain = kwargs['terrain']
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
    def handleAAA(self):
        numberOfPlanes = self.attacker.count(*PLANES)
        hits, flag = self.defender.rollTripleA(numberOfPlanes)
        self.attacker.takeCasualties(hits)
        return flag
    
    # def handleTargetStrikes(self):
    #     targetedHits = self.attacker.rollTargetStrikes()
    #     self.defender.takeCasualties(targetedHits)

    # def handleSurpriseStrike(self):
    #     pass
    
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