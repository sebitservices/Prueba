const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('Conexión exitosa a la base de datos!');
        
        // Probar una consulta simple
        const [rows] = await connection.execute('SHOW TABLES');
        console.log('Tablas en la base de datos:', rows);

        await connection.end();
    } catch (error) {
        console.error('Error al conectar:', error);
    }
}

testConnection(); 