from flask import Flask, request, jsonify
from flask_cors import CORS
#from AccessHistory import fetchState, insertState
from battle import Battle

app = Flask(__name__)

CORS(app, origins='https://bbrbattle.com')

#Add CORS headers
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = 'https://bbrbattle.com'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE'
    return response

"""
#History
@app.route('/api/history/get', methods=['POST'])
def getState():
    try:
        data = request.get_json()
        searchId = data.get('uid')
        collection = data.get('origin')
        results = fetchState(collection, searchId)
        response = jsonify(results)
        return response, 200
    except Exception as e:
        return {'error': str(e)}, 400
    
@app.route('/api/history/put', methods=['POST'])
def putState():
    try: 
        data = request.get_json()
        searchId = data.get('uid')
        collection = data.get('origin')
        currState = data.get('state')
        results = insertState(collection, searchId, currState)
        response = jsonify(results)
        return response, 200
    except Exception as e:
        return {'error': str(e)}, 400

#Need to Add to UI
@app.route('/api/history/report', methods=['POST'])
def putState():
    try: 
        data = request.get_json()
        searchId = ""
        collection = 'errors'
        currState = data.get('state')
        currState['origin'] = data.get('origin')
        results = insertState(collection, searchId, currState, gen_id=True)
        response = jsonify(results)
        return response, 200
    except Exception as e:
        return {'error': str(e)}, 400
"""

@app.route('/api/calculate', methods=['POST'])
def getResults():
    try:
        # Parses JSON data from the request body
        data = request.get_json() 
        # Stored as python dictionary
        terrain = data.get('terrain')
        attackerTech = data.get('attackerTech')
        defenderTech = data.get('defenderTech')
        attackerOrderOfLoss = data.get('attackerOrderOfLoss')
        defenderOrderOfLoss = data.get('defenderOrderOfLoss')
        attackerUnits = data.get('attackerUnits')
        defenderUnits = data.get('defenderUnits')

        results = Battle(
            terrain=terrain,
            attackerTech=attackerTech,
            defenderTech=defenderTech,
            attackerOrderOfLoss=attackerOrderOfLoss,
            defenderOrderOfLoss=defenderOrderOfLoss,
            attackerUnits=attackerUnits,
            defenderUnits=defenderUnits
        ).run().dump()
        response = jsonify(results)

        # Return a JSON response
        return response, 200
    
    except Exception as e:
        return {'error': str(e)}, 400

    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

