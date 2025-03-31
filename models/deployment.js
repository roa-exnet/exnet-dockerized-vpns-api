const { initDatabase } = require('../config/database');

const db = initDatabase();

function saveDeployment(deploymentData) {
  return new Promise((resolve, reject) => {
    const { deploymentId, deploymentDir, networkName, vpnPort, internalSubnet, peers, serverUrl } = deploymentData;
    
    db.run(
      `INSERT INTO vpn_deployments (id, directory_path, network_name, vpn_port, internal_subnet, peers, server_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [deploymentId, deploymentDir, networkName, vpnPort, internalSubnet, peers, serverUrl],
      function (err) {
        if (err) {
          console.error('Error al guardar en la base de datos:', err.message);
          reject(err);
        } else {
          resolve({
            id: deploymentId,
            directory_path: deploymentDir,
            network_name: networkName
          });
        }
      }
    );
  });
}

function getAllDeployments() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM vpn_deployments`, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getDeploymentById(deploymentId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM vpn_deployments WHERE id = ?`, [deploymentId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function getDeploymentByNetworkName(networkName) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM vpn_deployments WHERE network_name = ?`, [networkName], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function deleteDeployment(deploymentId) {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM vpn_deployments WHERE id = ?`, [deploymentId], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
}

module.exports = {
  saveDeployment,
  getAllDeployments,
  getDeploymentById,
  getDeploymentByNetworkName,
  deleteDeployment
};