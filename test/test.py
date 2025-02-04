from .tools import readInput, outputUnits
from battle import Battle
from utils import formatUnits, parseCasualties

class DebugBattle(Battle):
    def __init__(self, params):
        super().__init__(**params)
        print("Start\n")
        print(f"Attacker:\n{outputUnits(self.attacker.units)}\n")
        print(f"Defender:\n{outputUnits(self.defender.units)}")

    def nextRound(self):
        print('\n------')
        print(f"Round {self.rounds}\n")
        print(f"Attacker:\n{outputUnits(self.attacker.units)}\n")
        print(f"Defender:\n{outputUnits(self.defender.units)}")
        print("------")
        return super().nextRound()
    
    def dump(self):
        attackerCasualties = formatUnits(parseCasualties(self.attacker.casualties)) #Create Casualty Dict
        defenderCasualties = formatUnits(parseCasualties(self.defender.casualties))
        
        print("Done")
        print("------")
        print(f"Attacker: {self.attacker.initIPC}\n")
        print(f"Alive:\n{outputUnits(self.attacker.units)}\n")
        print(f"Retreated:\n{outputUnits(self.attacker.retreatedUnits)}\n")
        print(f"IPC(Alive): {self.attacker.getIpcValueUnits(self.attacker.units)} + {self.attacker.getIpcValueUnits(self.attacker.retreatedUnits)}")
        print(f"Dead:\n{outputUnits(self.attacker.casualties)}\n")
        print(f"IPC(Dead): {self.attacker.getIpcValueUnits(attackerCasualties)}")
        print("------")
        print(f"Defender: {self.defender.initIpc}\n")
        print(f"Alive:\n{outputUnits(self.defender.units)}\n")
        print(f"Retreated:\n{outputUnits(self.defender.retreatedUnits)}\n")
        print(f"IPC(Alive): {self.defender.getIpcValueUnits(self.defender.units)} + {self.defender.getIpcValueUnits(self.defender.retreatedUnits)}")
        print(f"Dead:\n{outputUnits(self.defender.casualties)}")
        print(f"IPC(Dead): {self.defender.getIpcValueUnits(defenderCasualties)}")

if __name__ == '__main__':
    params = readInput("./test/inputs/001.json")
    battle = DebugBattle(params)
    result = battle.run().dump()