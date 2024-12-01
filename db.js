const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración del pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST || '193.203.175.99',
    user: process.env.DB_USER || 'u498125654_mi_usuario',
    password: process.env.DB_PASSWORD || 'kaiser2121S',
    database: process.env.DB_NAME || 'u498125654_mi_base_datos',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Función para inicializar la base de datos
async function initializeDatabase() {
    try {
        console.log('Verificando estructura de la base de datos...');

        // Crear tabla usuarios si no existe
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                rol ENUM('administrador', 'editor', 'usuario') NOT NULL DEFAULT 'usuario',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla categorias si no existe
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS categorias (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla productos si no existe
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS productos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                descripcion TEXT,
                precio DECIMAL(10,2) NOT NULL,
                imagen TEXT,
                categoria_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (categoria_id) REFERENCES categorias(id)
            )
        `);

        // Crear tabla contenido_principal si no existe
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS contenido_principal (
                id INT PRIMARY KEY AUTO_INCREMENT,
                titulo VARCHAR(200) NOT NULL,
                descripcion TEXT,
                tipo ENUM('imagen', 'video', 'texto') NOT NULL,
                url LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Verificar si existe usuario administrador
        const [adminRows] = await pool.execute('SELECT * FROM usuarios WHERE rol = "administrador" LIMIT 1');
        
        // Si no hay admin, crear uno por defecto
        if (adminRows.length === 0) {
            await pool.execute(`
                INSERT INTO usuarios (usuario, password, rol) 
                VALUES ('admin', 'admin123', 'administrador')
            `);
            console.log('Usuario administrador creado por defecto');
        }

        console.log('Verificación de base de datos completada');
    } catch (error) {
        console.error('Error en la verificación de la base de datos:', error);
        throw error;
    }
}

// Inicializar la base de datos al importar el módulo
initializeDatabase().catch(console.error);

// Exportar el pool y la función de inicialización
module.exports = {
    pool,
    initializeDatabase
};
