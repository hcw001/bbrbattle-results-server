from .tools import readInput, outputUnits
from battle import Battle
from utils import formatUnits, parseCasualties

TESTS = {
    'start': True,
    'round': False,
    'preCombatUnits': False,
    'combatHitSummary': False,
    'surpriseStrikeHitSummary': False,
    'endSummary': False
}

class DebugBattle(Battle):
    def __init__(self, params):
        super().__init__(**params)
        if TESTS['start']:
            print("Start\n")
            print(f"Attacker:\n{outputUnits(self.attacker.units)}\n")
            print(f"Defender:\n{outputUnits(self.defender.units)}")

    def nextRound(self):
        if TESTS['round']:
            print('\n------')
            print(f"Round {self.rounds}\n")
            print(f"Attacker:\n{outputUnits(self.attacker.units)}\n")
            print(f"Defender:\n{outputUnits(self.defender.units)}")
            print("------")
        return super().nextRound()
    
    def rollCombat(self):
        if TESTS['preCombatUnits']:
            print("\nPre-Combat:\n")
            print(f"Attacker:\n{outputUnits(self.attacker.units)}\n")
            print(f"Defender:\n{outputUnits(self.defender.units)}")
        return super().rollCombat()
    
    def settleCombat(self, attackerHits, defenderHits):
        if TESTS['combatHitSummary']:
            print("\nCombat Summary:")
            print("Attacker Hits:")
            print(attackerHits)
            print("\nDefender Hits")
            print(defenderHits)

        return super().settleCombat(attackerHits, defenderHits)
    
    def settleSurpriseStrike(self, aSubHits, dSubHits):
        if TESTS['surpriseStrikeHitSummary']:
            print("Surprise Strike Summary:")
            print("Attacker Hits:")
            print(aSubHits)
            print("Defender Hits:")
            print(dSubHits)
        return super().settleSurpriseStrike(aSubHits, dSubHits)
    
    def dump(self):
        attackerCasualties = formatUnits(parseCasualties(self.attacker.casualties)) #Create Casualty Dict
        defenderCasualties = formatUnits(parseCasualties(self.defender.casualties)) 
        
        if TESTS['endSummary']:
            print("Done")
            print("------")
            print(f"Attacker: {self.attacker.initIpc}\n")
            print("------")
            print(f"Alive:\n{outputUnits(self.attacker.units)}\n")
            print(f"Retreated:\n{outputUnits(self.attacker.retreatedUnits)}\n")
            print(f"IPC(Alive): {self.attacker.getIpcValueUnits(self.attacker.units)} + {self.attacker.getIpcValueUnits(self.attacker.retreatedUnits)}")
            print(f"Dead:\n{outputUnits(attackerCasualties)}\n")
            print(f"IPC(Dead): {self.attacker.getIpcValueUnits(attackerCasualties)}")
            print("\n------")
            print(f"Defender: {self.defender.initIpc}\n")
            print("------")
            print(f"Alive:\n{outputUnits(self.defender.units)}\n")
            print(f"Retreated:\n{outputUnits(self.defender.retreatedUnits)}\n")
            print(f"IPC(Alive): {self.defender.getIpcValueUnits(self.defender.units)} + {self.defender.getIpcValueUnits(self.defender.retreatedUnits)}")
            print(f"Dead:\n{outputUnits(defenderCasualties)}")
            print(f"IPC(Dead): {self.defender.getIpcValueUnits(defenderCasualties)}")

if __name__ == '__main__':
    params = readInput("./test/inputs/002.json")
    try:
        battle = DebugBattle(params)
    except Exception as e:
        print("Run Failed")
    result = battle.run().dump()

    #Include target TPT
