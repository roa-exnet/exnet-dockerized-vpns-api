const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const deploymentModel = require('../models/deployment');
const wireguardService = require('../services/wireguard');

router.post('/deploy', async (req, res) => {
  const { peers, networkName } = req.body;

  if (!peers || !networkName) {
    return res.status(400).json({ error: 'Faltan parámetros necesarios' });
  }

  try {
    const vpnPort = Math.floor(Math.random() * (30000 - 20000 + 1)) + 20000;
    const internalSubnet = process.env.VPN_INTERNAL_SUBNET;
    const internalServerIp = process.env.VPN_INTERNAL_SERVER_IP;    
    const instanceName = `exnet-instance-${uuidv4().split('-')[0]}`;
    const serverUrl = `${instanceName}.exnet.cloud`;

    const deploymentData = await wireguardService.createDeployment({
      vpnPort,
      internalSubnet,
      peers,
      serverUrl,
      networkName
    });

    const tokenRes = await axios.post('https://nginx.exnet.cloud/api/tokens', {
      identity: process.env.NGINX_IDENTITY,
      secret: process.env.NGINX_SECRET
    });    
    const token = tokenRes.data.token;

    const proxyRes = await axios.post('https://nginx.exnet.cloud/api/nginx/proxy-hosts', {
      domain_names: [serverUrl],
      forward_scheme: 'http',
      forward_host: internalServerIp,
      forward_port: vpnPort,
      access_list_id: '0',
      certificate_id: 0,
      meta: { letsencrypt_agree: false, dns_challenge: false },
      advanced_config: '',
      locations: [],
      block_exploits: false,
      caching_enabled: false,
      allow_websocket_upgrade: false,
      http2_support: false,
      hsts_enabled: false,
      hsts_subdomains: false,
      ssl_forced: false
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const proxyId = proxyRes.data.id;

    await axios.put(`https://nginx.exnet.cloud/api/nginx/proxy-hosts/${proxyId}`, {
      domain_names: [serverUrl],
      forward_scheme: 'http',
      forward_host: internalServerIp,
      forward_port: '8080',
      access_list_id: '0',
      certificate_id: 'new',
      ssl_forced: true,
      http2_support: true,
      meta: {
        letsencrypt_email: 'roa.exnet@gmail.com',
        letsencrypt_agree: true,
        dns_challenge: false
      },
      advanced_config: '',
      locations: [],
      block_exploits: false,
      caching_enabled: false,
      allow_websocket_upgrade: false,
      hsts_enabled: false,
      hsts_subdomains: false
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const savedDeployment = await deploymentModel.saveDeployment({
      ...deploymentData,
      serverUrl
    });

    res.status(200).json({
      message: 'VPN, subdominio y SSL desplegados correctamente',
      deploymentId: deploymentData.deploymentId,
      domain: serverUrl,
      internalIp: internalServerIp,
      vpnPort
    });
  } catch (error) {
    console.error(error?.response?.data || error);
    res.status(500).json({ error: 'Error al desplegar la VPN o configurar el proxy con SSL' });
  }
});


router.get('/deployments', async (req, res) => {
  try {
    const deployments = await deploymentModel.getAllDeployments();
    res.status(200).json(deployments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

router.get('/deployments/:deploymentId', async (req, res) => {
  const { deploymentId } = req.params;
  
  try {
    const deployment = await deploymentModel.getDeploymentById(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({ error: 'Despliegue VPN no encontrado' });
    }
    
    res.status(200).json(deployment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

router.get('/networks/:networkName', async (req, res) => {
  const { networkName } = req.params;
  
  try {
    const deployment = await deploymentModel.getDeploymentByNetworkName(networkName);
    
    if (!deployment) {
      return res.status(404).json({ error: 'Red VPN no encontrada' });
    }
    
    res.status(200).json(deployment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

router.get('/deployments/:deploymentId/peers', async (req, res) => {
  const { deploymentId } = req.params;
  
  try {
    const deployment = await deploymentModel.getDeploymentById(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({ error: 'Despliegue VPN no encontrado' });
    }

    try {
      const peerConfigurations = wireguardService.getPeerConfigurations(deployment.directory_path, deploymentId);
      
      res.status(200).json({
        deploymentId,
        networkName: deployment.network_name,
        totalPeers: peerConfigurations.length,
        peers: peerConfigurations
      });
    } catch (error) {
      console.error('Error al leer las configuraciones de los peers:', error);
      res.status(500).json({ error: 'Error al obtener las configuraciones de los peers' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

router.get('/deployments/:deploymentId/peers/:peerNumber/qrcode', async (req, res) => {
  const { deploymentId, peerNumber } = req.params;
  
  try {
    const deployment = await deploymentModel.getDeploymentById(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({ error: 'Despliegue VPN no encontrado' });
    }

    const qrCodePath = wireguardService.getPeerQRCodePath(deployment.directory_path, peerNumber);
    
    if (!fs.existsSync(qrCodePath)) {
      return res.status(404).json({ error: 'Código QR no encontrado para este peer' });
    }
    
    res.sendFile(qrCodePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

router.delete('/deployments/:deploymentId', async (req, res) => {
  const { deploymentId } = req.params;
  
  try {
    const deployment = await deploymentModel.getDeploymentById(deploymentId);
    
    if (!deployment) {
      return res.status(404).json({ error: 'Despliegue VPN no encontrado' });
    }
    
    try {
      await wireguardService.removeDeployment(deployment.directory_path);
      
      await deploymentModel.deleteDeployment(deploymentId);
      
      res.status(200).json({ message: 'Despliegue eliminado correctamente' });
    } catch (error) {
      console.error('Error al eliminar el despliegue:', error);
      res.status(500).json({ error: 'Error al eliminar el despliegue' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar la base de datos' });
  }
});

module.exports = router;