const express = require('express');
const { pool, checkConnection } = require('./db');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'https://admintechflow.com',
        'http://localhost:5500'
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

// Ruta para el login
app.post('/login', async (req, res) => {
    const { usuario, password } = req.body;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM usuarios WHERE usuario = ? AND password = ?',
            [usuario, password]
        );

        if (rows.length > 0) {
            return res.json({
                success: true,
                usuario: rows[0].usuario,
                rol: rows[0].rol
            });
        } else {
            return res.status(401).json({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            });
        }
    } catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Ruta para obtener usuarios
app.get('/usuarios', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM usuarios');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Ruta para obtener productos
app.get('/productos', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM productos');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Ruta para obtener categorías
app.get('/categorias', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM categorias');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
});

// Ruta para obtener contenido principal
app.get('/contenido-principal', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM contenido_principal');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener contenido principal:', error);
        res.status(500).json({ error: 'Error al obtener contenido principal' });
    }
});

// Ruta para estadísticas
app.get('/estadisticas', async (req, res) => {
    try {
        // Obtener conteo de categorías
        const [categorias] = await pool.execute('SELECT COUNT(*) as total_categorias FROM categorias');
        
        // Obtener productos con sus categorías
        const [productos] = await pool.execute(`
            SELECT 
                p.*,
                COALESCE(c.nombre, 'Sin categoría') as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id
        `);
        
        // Obtener conteo de usuarios
        const [usuarios] = await pool.execute('SELECT COUNT(*) as total_usuarios FROM usuarios');

        const estadisticas = {
            total_productos: productos.length,
            total_categorias: categorias[0].total_categorias,
            total_usuarios: usuarios[0].total_usuarios,
            productos_recientes: productos.slice(0, 5),
            productos_caros: [...productos].sort((a, b) => b.precio - a.precio).slice(0, 5)
        };
        
        res.json(estadisticas);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
}); 