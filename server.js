const express = require('express');
const { pool } = require('./db');
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

app.use(express.json({
    limit: '500mb',
    verify: (req, res, buf) => {
        try {
            JSON.parse(buf);
        } catch(e) {
            console.error('Error parsing JSON:', e);
            throw new Error('Invalid JSON');
        }
    }
}));

app.use(express.urlencoded({
    limit: '500mb',
    extended: true,
    parameterLimit: 50000
}));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Middleware para verificar rol
const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        const rol = req.headers['user-role'];
        if (!rolesPermitidos.includes(rol)) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        next();
    };
};

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

// Rutas de usuarios
app.get('/usuarios', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, usuario, rol FROM usuarios');
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/usuarios', async (req, res) => {
    try {
        const { usuario, password, rol } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO usuarios (usuario, password, rol) VALUES (?, ?, ?)',
            [usuario, password, rol]
        );
        res.json({ id: result.insertId });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(400).json({ error: error.message });
    }
});

app.put('/usuarios/:id', async (req, res) => {
    try {
        const { usuario, password, rol } = req.body;
        if (password) {
            await pool.execute(
                'UPDATE usuarios SET usuario = ?, password = ?, rol = ? WHERE id = ?',
                [usuario, password, rol, req.params.id]
            );
        } else {
            await pool.execute(
                'UPDATE usuarios SET usuario = ?, rol = ? WHERE id = ?',
                [usuario, rol, req.params.id]
            );
        }
        res.json({ message: "Usuario actualizado" });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/usuarios/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
        res.json({ message: "Usuario eliminado" });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(400).json({ error: error.message });
    }
});

// Rutas de productos
app.get('/productos', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                p.*,
                COALESCE(c.nombre, 'Sin categoría') as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            ORDER BY p.created_at DESC
        `);
        res.json(rows || []);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/productos', async (req, res) => {
    try {
        const { nombre, descripcion, precio, imagen, categoria_id } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO productos (nombre, descripcion, precio, imagen, categoria_id) VALUES (?, ?, ?, ?, ?)',
            [nombre, descripcion, precio, imagen, categoria_id]
        );
        res.json({ 
            id: result.insertId,
            message: "Producto creado exitosamente" 
        });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(400).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
}); 