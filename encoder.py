import hashlib
import json

def dictHash(dictionary):
    """Creates a hash of a dictionary."""

    # Convert the dictionary to a JSON string (ensures consistent ordering)
    dictStr = json.dumps(dictionary, sort_keys=True)

    # Create a hash object (e.g., using MD5)
    hashObject = hashlib.md5(dictStr.encode())

    # Return the hexadecimal representation of the hash
    return hashObject.hexdigest()

def JSONHash(jsonString):
    data = jsonString.encode()
    hashed = hashlib.sha256(data).hexdigest()
    return hashed