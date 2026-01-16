const sql = require('mssql');


const config = {
  user: process.env.DB_USER || 'api_user',
  password: process.env.DB_PASS || '12345',
  server: 'LAPTOP-D6VO67NP', //Aqui va el nombre de sus servidores 
  database: 'F1GarageManager',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const poolPromise = new sql.ConnectionPool(config).connect().then(pool => {
  console.log('Conectado a SQL Server');
  return pool;
}).catch(err => {
  console.error('Conexion con la BD fallida', err);
  throw err;
});

module.exports = { sql, poolPromise };
