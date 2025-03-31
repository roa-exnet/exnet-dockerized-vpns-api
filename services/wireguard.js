// services/wireguard.js - Gestión de contenedores WireGuard
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

const DEPLOYMENTS_BASE_DIR = path.join(__dirname, '..', 'deployments');

function generateDockerComposeContent(params) {
  const { vpnPort, internalSubnet, peers, serverUrl, puid = 1000, pgid = 1000 } = params;
  
  return `version: '3.8'

services:
  wireguard:
    image: linuxserver/wireguard
    container_name: wireguard_${params.deploymentId}
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=${puid}
      - PGID=${pgid}
      - TZ=Etc/UTC
      - SERVERURL=${serverUrl}
      - SERVERPORT=${vpnPort}
      - PEERS=${peers}
      - PEERDNS=auto
      - INTERNAL_SUBNET=${internalSubnet}
    volumes:
      - ./config:/config
      - /lib/modules:/lib/modules
    ports:
      - "${vpnPort}:51820/udp"
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
      - net.ipv4.ip_forward=1
    restart: unless-stopped
`;
}

function generateDockerfileContent(params) {
  return `FROM linuxserver/wireguard

# Exponer los puertos necesarios
EXPOSE ${params.vpnPort}/udp
`;
}

async function createDeployment(deploymentParams) {
  const { vpnPort, internalSubnet, peers, serverUrl, networkName } = deploymentParams;
  
  const deploymentId = uuidv4();
  
  const deploymentDir = path.join(DEPLOYMENTS_BASE_DIR, deploymentId);
  fs.mkdirSync(deploymentDir, { recursive: true });
  
  const configDir = path.join(deploymentDir, 'config');
  fs.mkdirSync(configDir, { recursive: true });
  
  const params = {
    vpnPort,
    internalSubnet,
    peers,
    serverUrl,
    deploymentId
  };
  
  fs.writeFileSync(
    path.join(deploymentDir, 'docker-compose.yml'),
    generateDockerComposeContent(params)
  );
  
  fs.writeFileSync(
    path.join(deploymentDir, 'Dockerfile'),
    generateDockerfileContent(params)
  );
  
  return new Promise((resolve, reject) => {
    exec(`cd ${deploymentDir} && docker-compose up -d`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al ejecutar docker-compose: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error(`Error de docker-compose: ${stderr}`);
      }
      
      console.log(`Salida de docker-compose: ${stdout}`);
      
      resolve({
        deploymentId,
        deploymentDir,
        networkName,
        vpnPort,
        internalSubnet,
        peers,
        serverUrl
      });
    });
  });
}

function removeDeployment(deploymentDir) {
  return new Promise((resolve, reject) => {
    exec(`cd ${deploymentDir} && docker-compose down`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error al detener los contenedores: ${error.message}`);
        reject(error);
        return;
      }
      
      resolve({ success: true, stdout, stderr });
    });
  });
}

function getPeerConfigurations(deploymentDir, deploymentId) {
  const configPath = path.join(deploymentDir, 'config');
  
  if (!fs.existsSync(configPath)) {
    throw new Error('Directorio de configuración no encontrado');
  }

  const peerDirs = fs.readdirSync(configPath)
    .filter(dir => dir.startsWith('peer') && fs.statSync(path.join(configPath, dir)).isDirectory());
  
  const peerConfigurations = [];
  
  for (const peerDir of peerDirs) {
    const peerNumber = peerDir.replace('peer', '');
    const confFile = path.join(configPath, peerDir, `peer${peerNumber}.conf`);
    const qrCodeFile = path.join(configPath, peerDir, `peer${peerNumber}.png`);
    
    if (fs.existsSync(confFile)) {
      const config = fs.readFileSync(confFile, 'utf8');
      
      const hasQRCode = fs.existsSync(qrCodeFile);
      
      peerConfigurations.push({
        peerNumber,
        config,
        hasQRCode,
        qrCodePath: hasQRCode ? `/api/deployments/${deploymentId}/peers/${peerNumber}/qrcode` : null
      });
    }
  }
  
  return peerConfigurations;
}

function getPeerQRCodePath(deploymentDir, peerNumber) {
  return path.join(deploymentDir, 'config', `peer${peerNumber}`, `peer${peerNumber}.png`);
}

module.exports = {
  createDeployment,
  removeDeployment,
  getPeerConfigurations,
  getPeerQRCodePath
};