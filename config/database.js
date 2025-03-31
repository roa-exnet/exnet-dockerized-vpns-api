const sqlite3 = require('sqlite3').verbose();

function initDatabase() {
  const db = new sqlite3.Database('./vpn_deployments.db', (err) => {
    if (err) {
      console.error('Error al conectar con la base de datos:', err.message);
    } else {
      console.log('Conexión establecida con la base de datos SQLite');
      
      db.run(`CREATE TABLE IF NOT EXISTS vpn_deployments (
        id TEXT PRIMARY KEY,
        directory_path TEXT NOT NULL,
        network_name TEXT NOT NULL,
        vpn_port INTEGER NOT NULL,
        internal_subnet TEXT NOT NULL,
        peers INTEGER NOT NULL,
        server_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
    }
  });

  return db;
}

module.exports = {
  initDatabase
};