from utils import isEmptyUnit
import json
from lib import EndCondition

def readInput(path):
    with open(path, 'r') as f:
        data = json.load(f)
    inputs = {key: data.get(key) for key in data}
    return inputs

def outputUnits(units):
    output = ""
    for unit in units:
        if not isEmptyUnit(units[unit]):
            output += f"{unit:<10}: {units[unit]:<3}\n"
    return "None" if output == ""  else output


def outputWinRates(conditions):
    print(
    f"""
    Attacker Wins: {conditions[EndCondition.ATTACKER_WIN]}
    DefenderWins: {conditions[EndCondition.DEFENDER_WIN]}
    Draw: {conditions[EndCondition.DRAW]}
    Stalemate: {conditions[EndCondition.STALEMATE]}
    """
    )