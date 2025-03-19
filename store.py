import psycopg2
from dotenv import load_dotenv
import os
from encoder import JSONHash

# Load environment variables from .env
load_dotenv()

# Fetch variables
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")
VERSION = os.getenv("version")

def get_connection():
    try:
        connection = psycopg2.connect(
            user=USER,
            password=PASSWORD,
            host=HOST,
            port=PORT,
            dbname=DBNAME
        )
        return connection
    except Exception as e:
        raise IOError()

def logError(battle_id):
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO results (battle_id, is_error) VALUES (%s, %s)", (battle_id, True))
        connection.commit()
        cursor.close()
        connection.close()
    except Exception as e:
        print("Log Error Failed.")
        return

def logOutputs(battle_id, outputs):
    try:
        outputs_hash = JSONHash(f"{outputs}&v={VERSION}")
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO results (battle_id, is_error, hash, outputs) VALUES (%s, %s, %s, %s)", (battle_id, False, outputs_hash, outputs))
        connection.commit()
        cursor.close()
        connection.close()
    except Exception as e:
        print("Log Outputs Failed.")
        return
    
def logUserRequest(battle_id, request):
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO users (battle_id, user_ip, user_agent, user_referer) VALUES (%s, %s, %s, %s)", (battle_id, request.remote_addr, request.headers.get('User-Agent'), request.headers.get('Referer')))
        connection.commit()
        connection.close()
    except Exception as e:
        print("Log User Failed")
        return
    