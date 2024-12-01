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

app.put('/productos/:id', async (req, res) => {
    try {
        const { nombre, descripcion, precio, imagen, categoria_id } = req.body;
        await pool.execute(
            'UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, imagen = ?, categoria_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [nombre, descripcion, precio, imagen, categoria_id, req.params.id]
        );
        res.json({ message: "Producto actualizado exitosamente" });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/productos/:id', verificarRol(['administrador']), async (req, res) => {
    try {
        await pool.execute('DELETE FROM productos WHERE id = ?', [req.params.id]);
        res.json({ message: "Producto eliminado exitosamente" });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(400).json({ error: error.message });
    }
});

// Rutas para contenido principal
app.get('/contenido-principal', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                id,
                titulo,
                descripcion,
                tipo,
                CASE 
                    WHEN tipo = 'imagen' THEN CONCAT('data:image/jpeg;base64,', url)
                    WHEN tipo = 'video' THEN CONCAT('data:video/mp4;base64,', url)
                    ELSE url 
                END as url,
                created_at,
                updated_at
            FROM contenido_principal 
            ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener contenido:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/contenido-principal', async (req, res) => {
    console.log('Iniciando POST /contenido-principal');
    try {
        const { titulo, descripcion, tipo, url } = req.body;
        
        if (!titulo || !tipo || !url) {
            console.error('Datos faltantes:', { titulo, tipo, url: !!url });
            return res.status(400).json({ 
                error: 'Faltan campos requeridos',
                details: {
                    titulo: !titulo,
                    tipo: !tipo,
                    url: !url
                }
            });
        }

        // Remover el prefijo data:image/jpeg;base64, o data:video/mp4;base64,
        let cleanUrl = url;
        if (tipo === 'imagen' && url.startsWith('data:image')) {
            cleanUrl = url.split(',')[1];
        } else if (tipo === 'video' && url.startsWith('data:video')) {
            cleanUrl = url.split(',')[1];
        }

        console.log('Guardando contenido de tipo:', tipo);

        const [result] = await pool.execute(
            'INSERT INTO contenido_principal (titulo, descripcion, tipo, url) VALUES (?, ?, ?, ?)',
            [titulo, descripcion, tipo, cleanUrl]
        );

        console.log('Contenido guardado exitosamente, ID:', result.insertId);
        res.json({ 
            id: result.insertId,
            message: "Contenido creado exitosamente" 
        });
    } catch (error) {
        console.error('Error completo:', error);
        res.status(500).json({ 
            error: 'Error al procesar contenido',
            details: error.message
        });
    }
});

app.put('/contenido-principal/:id', async (req, res) => {
    try {
        const { titulo, descripcion, tipo, url } = req.body;
        
        // Remover el prefijo data:image/jpeg;base64, o data:video/mp4;base64,
        let cleanUrl = url;
        if (tipo === 'imagen' && url.startsWith('data:image')) {
            cleanUrl = url.split(',')[1];
        } else if (tipo === 'video' && url.startsWith('data:video')) {
            cleanUrl = url.split(',')[1];
        }

        await pool.execute(
            'UPDATE contenido_principal SET titulo = ?, descripcion = ?, tipo = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [titulo, descripcion, tipo, cleanUrl, req.params.id]
        );
        res.json({ message: "Contenido actualizado exitosamente" });
    } catch (error) {
        console.error('Error al actualizar contenido:', error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/contenido-principal/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM contenido_principal WHERE id = ?', [req.params.id]);
        res.json({ message: "Contenido eliminado exitosamente" });
    } catch (error) {
        console.error('Error al eliminar contenido:', error);
        res.status(400).json({ error: error.message });
    }
});

// Rutas para categorías
app.get('/categorias', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                c.*,
                COUNT(p.id) as total_productos
            FROM categorias c
            LEFT JOIN productos p ON c.id = p.categoria_id
            GROUP BY c.id
            ORDER BY c.nombre ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/categorias', verificarRol(['administrador', 'editor']), async (req, res) => {
    try {
        const { nombre } = req.body;
        const [result] = await pool.execute(
            'INSERT INTO categorias (nombre) VALUES (?)',
            [nombre]
        );
        res.json({ 
            id: result.insertId,
            message: "Categoría creada exitosamente" 
        });
    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(400).json({ error: error.message });
    }
});

app.put('/categorias/:id', verificarRol(['administrador', 'editor']), async (req, res) => {
    try {
        const { nombre } = req.body;
        await pool.execute(
            'UPDATE categorias SET nombre = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [nombre, req.params.id]
        );
        res.json({ message: "Categoría actualizada exitosamente" });
    } catch (error) {
        console.error('Error al actualizar categoría:', error);
        res.status(400).json({ error: error.message });
    }
});

app.delete('/categorias/:id', verificarRol(['administrador']), async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT COUNT(*) as total FROM productos WHERE categoria_id = ?',
            [req.params.id]
        );
        
        if (rows[0].total > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar la categoría porque tiene productos asociados',
                total_productos: rows[0].total 
            });
        }

        await pool.execute('DELETE FROM categorias WHERE id = ?', [req.params.id]);
        res.json({ message: "Categoría eliminada exitosamente" });
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message
    });
});

// Añadir ruta de health check
app.get('/health', async (req, res) => {
    try {
        // Verificar conexión a la base de datos
        await pool.execute('SELECT 1');
        res.json({
            status: 'OK',
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            database: 'Disconnected',
            error: error.message
        });
    }
});

// Añadir manejo de errores 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
}); 