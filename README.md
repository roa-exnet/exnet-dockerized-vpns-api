CREAR VPN (POST): 
http://localhost:3000/api/deploy

{
    "peers": 30,
    "networkName": "test"
}


VER PEERS (GET):
http://localhost:3000/api/deployments/{NETWORK_ID}/peers


VER DEPLOYMENTS (GET):
http://localhost:3000/api/deployments


BORRAR DEPLOYMENTS (DELETE):
http://localhost:3000/api/deployments/{NETWORK_ID}


OBTENER DATOS VPN (GET)
http://localhost:3000/api/deployments/{NETWORK_ID}

