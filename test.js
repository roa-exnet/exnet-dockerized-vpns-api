const axios = require('axios');

axios.post('http://localhost:3000/deploy', {
  vpnPort: 5555,
  internalSubnet: '10.14.14.0',
  peers: 30,
  serverUrl: 'test',
  networkName: "ruptur"
})
.then(function (response) {
  console.log(response.data);
})
.catch(function (error) {
  console.error('Error:', error);
});