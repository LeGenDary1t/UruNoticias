// Backend/test-connection.js
const db = require('./db');

async function test() {
  try {
    const [rows] = await db.query('SHOW TABLES');
    console.log('Conexión exitosa. Tablas en la base de datos:');
    console.table(rows);
  } catch (err) {
    console.error('Error de conexión:', err.message);
  } finally {
    process.exit();
  }
}

test();
