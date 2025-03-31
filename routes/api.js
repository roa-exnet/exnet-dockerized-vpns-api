const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const deploymentModel = require('../models/deployment');
const wireguardService = require('../services/wireguard');

router.post('/deploy', async (req, res) => {
  const { vpnPort, internalSubnet, peers, serverUrl, networkName } = req.body;

  if (!vpnPort || !internalSubnet || !peers || !serverUrl || !networkName) {
    return res.status(400).json({ error: 'Faltan parámetros necesarios' });
  }

  try {
    const deploymentData = await wireguardService.createDeployment({
      vpnPort, 
      internalSubnet, 
      peers, 
      serverUrl, 
      networkName
    });
    
    const savedDeployment = await deploymentModel.saveDeployment(deploymentData);
    
    res.status(200).json({ 
      message: 'VPN desplegada exitosamente', 
      deploymentId: deploymentData.deploymentId,
      deploymentDir: deploymentData.deploymentDir,
      networkName: deploymentData.networkName
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al desplegar la VPN' });
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