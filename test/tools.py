from utils import isEmptyUnit
import json

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


