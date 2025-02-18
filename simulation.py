from encoder import dictHash
from battle import Battle
import copy
from functools import reduce

class Simulation:
    def __init__(self, **kwargs):
        self.params = kwargs
        self.results = {}
        self.N = 20000
    def run(self):
        for _ in range(self.N):
            battleParams = copy.deepcopy(self.params)
            battle = Battle(**battleParams)
            result = battle.run().dump()
            self.addResult(copy.deepcopy(result))
            del battle
            del battleParams
        return self
    def addResult(self, result):
        hashValue = dictHash(result)
        if hashValue in self.results:
            self.results[hashValue]['count'] += 1
        else:
            self.results[hashValue] = {
                'outcome': result,
                'count': 1
            }
    def dump(self):
        #Calculate Result Distribution
        endConditions = [0,0,0,0]
        for hashKey, data in self.results.items():
            endConditions[data['outcome']['endCondition']] += data['count']
        
        endConditions = [condition / self.N for condition in endConditions]
        assert sum(endConditions) == 1

        #Order outcomes by casualty
        attackerOutcomes = sorted([{**props['outcome']['attacker'], 'rounds': props['outcome']['rounds'], 'count': props['count']} for key, props in self.results.items()], key=lambda props: props['ipc'], reverse=True)
        defenderOutcomes = sorted([{**props['outcome']['defender'], 'count': props['count']} for key, props in self.results.items()], key=lambda props: props['ipc'], reverse=True)

        sortedAttackerOutcomes = {}
        for item in attackerOutcomes:
            key = dictHash(item['alive'])
            if key in sortedAttackerOutcomes:
                assert item['ipc'] == sortedAttackerOutcomes[key]['ipc']
                sortedAttackerOutcomes[key]['count'] += item['count']
            else:
                sortedAttackerOutcomes[key] = item
        sortedAttackerOutcomes = [props for key, props in sortedAttackerOutcomes.items()]

        sortedDefenderOutcomes = {}
        for item in defenderOutcomes:
            key = dictHash(item['alive'])
            if key in sortedDefenderOutcomes:
                assert item['ipc'] == sortedDefenderOutcomes[key]['ipc']
                sortedDefenderOutcomes[key]['count'] += item['count']
            else:
                sortedDefenderOutcomes[key] = item
        sortedDefenderOutcomes = [props for key, props in sortedDefenderOutcomes.items()]

        cumCountAttacker = 0
        cumIpcLossAttacker = 0
        
        for outcome in sortedAttackerOutcomes:
            #Assign percentiles
            outcome['percentile'] = cumCountAttacker / self.N
            cumCountAttacker += outcome['count']
            #Increase cumulative IPC
            cumIpcLossAttacker += outcome['ipc'] * outcome['count']
            #Adjust count to confidence
            outcome['count'] = outcome['count'] / self.N

        cumCountDefender = 0
        cumIpcLossDefender = 0
        for outcome in sortedDefenderOutcomes:
            #Assign percentiles
            outcome['percentile'] = cumCountDefender / self.N
            cumCountDefender += outcome['count']
            #Increase cumulative IPC
            cumIpcLossDefender += outcome['ipc'] * outcome['count']
            #Adjust count to confidence
            outcome['count'] = outcome['count'] / self.N

        assert cumCountAttacker == self.N
        assert cumCountDefender == self.N

        aveNumberRounds = reduce(lambda acc, result: acc + self.results[result]['outcome']['rounds'] * self.results[result]['count'], self.results, 0) / self.N

        #average ipcs
        aveAttackerIPC = cumIpcLossAttacker / self.N
        aveDefenderIPC = cumIpcLossDefender / self.N
        

        outcomes = {
            'attacker': {
                'unitsAlive': list(map(lambda outcome: outcome['alive'], sortedAttackerOutcomes)),
                'unitsDead': list(map(lambda outcome: outcome['dead'], sortedAttackerOutcomes)),
                'outcomePercentile': list(map(lambda outcome: outcome['percentile'], sortedAttackerOutcomes)),
                'outcomeCount': list(map(lambda outcome: outcome['count'], sortedAttackerOutcomes)),
                'ipcLoss': list(map(lambda outcome: outcome['ipc'], sortedAttackerOutcomes)),
            },
            'defender': {
                'unitsAlive': list(map(lambda outcome: outcome['alive'], sortedDefenderOutcomes)),
                'unitsDead': list(map(lambda outcome: outcome['dead'], sortedDefenderOutcomes)),
                'outcomePercentile': list(map(lambda outcome: outcome['percentile'], sortedDefenderOutcomes)),
                'outcomeCount': list(map(lambda outcome: outcome['count'], sortedDefenderOutcomes)),
                'ipcLoss': list(map(lambda outcome: outcome['ipc'], sortedDefenderOutcomes)),
            }
        }

        #Send back as lists
        return {
                'outcomes': outcomes,
                'stats': {
                    'attackerIpc': aveAttackerIPC,
                    'defenderIpc': aveDefenderIPC,
                    'numberRounds': aveNumberRounds,
                    'endCondition': endConditions
                }
            }

#Conquer
#Survive
#