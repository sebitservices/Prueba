const express = require('express');
const { checkConnection, createTables } = require('./db');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'https://admintechflow.com',
        'http://localhost:5500' // para desarrollo local
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Ruta de prueba
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});

// Inicialización del servidor
async function startServer() {
    try {
        // Verificar conexión a la base de datos
        const isConnected = await checkConnection();
        if (!isConnected) {
            throw new Error('No se pudo conectar a la base de datos');
        }

        // Crear tablas
        await createTables();

        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en puerto ${PORT}`);
        });
    } catch (error) {
        console.error('Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer(); 