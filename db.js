const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false,
        servername: 'admintechflow.com'
    }
});

// Función para verificar la conexión
async function checkConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Conexión a la base de datos establecida correctamente');
        connection.release();
        return true;
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        return false;
    }
}

// Script para crear las tablas
async function createTables() {
    try {
        const connection = await pool.getConnection();

        // Crear tabla categorías
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS categorias (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla productos
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS productos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(255) NOT NULL,
                descripcion TEXT,
                precio INT NOT NULL,
                imagen TEXT,
                categoria_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (categoria_id) REFERENCES categorias(id)
            )
        `);

        // Crear tabla contenido_principal
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS contenido_principal (
                id INT PRIMARY KEY AUTO_INCREMENT,
                titulo VARCHAR(255) NOT NULL,
                descripcion TEXT,
                tipo VARCHAR(50) NOT NULL,
                url TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla usuarios
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol VARCHAR(50) NOT NULL
            )
        `);

        // Verificar si existe el usuario admin
        const [rows] = await connection.execute(
            'SELECT * FROM usuarios WHERE usuario = ?', 
            ['seba']
        );

        if (rows.length === 0) {
            await connection.execute(
                'INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)',
                ['seba', 'admin123', 'administrador']
            );
            console.log('Usuario admin creado exitosamente');
        }

        connection.release();
        console.log('Tablas creadas exitosamente');
    } catch (error) {
        console.error('Error al crear las tablas:', error);
        throw error;
    }
}

// Exportar funciones y pool
module.exports = {
    pool,
    checkConnection,
    createTables,
    // Función helper para queries
    query: async (sql, params) => {
        try {
            const [results] = await pool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Error en query:', error);
            throw error;
        }
    }
};
