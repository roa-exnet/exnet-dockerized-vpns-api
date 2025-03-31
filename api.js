const express = require('express');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./config/database');
const apiRoutes = require('./routes/api');

const app = express();
const port = 3000;

const DEPLOYMENTS_BASE_DIR = path.join(__dirname, 'deployments');

if (!fs.existsSync(DEPLOYMENTS_BASE_DIR)) {
  fs.mkdirSync(DEPLOYMENTS_BASE_DIR, { recursive: true });
}

const db = initDatabase();

app.use(express.json());

app.use('/api', apiRoutes);

app.listen(port, () => {
  console.log(`API REST ejecutándose en http://localhost:${port}`);
});

process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Conexión con la base de datos cerrada');
    process.exit(0);
  });
});