CREAR VPN (POST): 
http://localhost:3000/api/deploy

{
    "vpnPort": 3333,
    "internalSubnet": "10.14.88.0",
    "peers": 30,
    "serverUrl": "test",
    "networkName": "ruptur"
}


VER PEERS (GET):
http://localhost:3000/api/deployments/{NETWORK_ID}/peers


VER DEPLOYMENTS (GET):
http://localhost:3000/api/deployments


BORRAR DEPLOYMENTS (DELETE):
http://localhost:3000/api/deployments/{NETWORK_ID}


OBTENER DATOS VPN (GET)
http://localhost:3000/api/deployments/{NETWORK_ID}

