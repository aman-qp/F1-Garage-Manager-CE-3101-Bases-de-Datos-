const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { sql, poolPromise } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// =============================================
// MIDDLEWARE
// =============================================

app.use(cors({
  origin: 'http://localhost:5173', // URL de React (Vite)
  credentials: true
}));
app.use(express.json());

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 // 1 hora (ejemplo)
  }
}));

// Middleware de autenticación
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  next();
}

// Middleware de autorización por rol
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    if (!roles.includes(req.session.rol)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
  };
}


const VALID_ROLES = ['Admin', 'Engineer', 'Driver'];

// =============================================
// RUTAS DE AUTENTICACIÓN
// =============================================

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { nombre_usuario, contrasena } = req.body;

    if (!nombre_usuario || !contrasena) {
      return res.status(400).json({ message: 'Credenciales incompletas' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre_usuario', sql.VarChar(80), nombre_usuario)
      .execute('sp_Login');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const usuario = result.recordset[0];
    const match = await bcrypt.compare(contrasena, usuario.contrasena_hash);

    if (!match) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Crear sesión
    req.session.userId = usuario.id_usuario;
    req.session.rol = usuario.rol;
    req.session.nombre_usuario = usuario.nombre_usuario;
    req.session.id_equipo = usuario.id_equipo;

    res.json({
      message: 'Login exitoso',
      usuario: {
        id: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol,
        id_equipo: usuario.id_equipo
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout exitoso' });
  });
});

// Verificar sesión actual
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    id: req.session.userId,
    nombre_usuario: req.session.nombre_usuario,
    rol: req.session.rol,
    id_equipo: req.session.id_equipo
  });
});

// =============================================
// RUTAS DE USUARIOS
// =============================================

// Crear usuario (Admin only)
app.post('/api/usuarios', requireRole('Admin'), async (req, res) => {
  try {
    const { nombre_usuario, nombre_completo, contrasena, rol, id_equipo } = req.body;

    if (!nombre_usuario || !nombre_completo || !contrasena || !rol) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    if (!VALID_ROLES.includes(rol)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo || null)
      .input('nombre_usuario', sql.VarChar(80), nombre_usuario)
      .input('nombre_completo', sql.VarChar(100), nombre_completo)
      .input('rol', sql.VarChar(20), rol)
      .input('contrasena_hash', sql.VarChar(255), hashedPassword)
      .execute('sp_CrearUsuario');

    const newId = result.recordset[0].id;

    return res.status(201).json({
      id: newId,
      nombre_usuario,
      nombre_completo,
      rol,
      id_equipo: id_equipo || null
    });
  } catch (err) {
    console.error('Error al crear usuario:', err);
    
    if (err.message && err.message.includes('ya existe')) {
      return res.status(409).json({ message: err.message });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Listar usuarios (Admin only)
app.get('/api/usuarios', requireRole('Admin'), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .execute('sp_ListarUsuarios');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE EQUIPOS
// =============================================

// Listar equipos
app.get('/api/equipos', requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .execute('sp_ListarEquipos');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar equipos:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear equipo (Admin only)
app.post('/api/equipos', requireRole('Admin'), async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', sql.VarChar(100), nombre)
      .execute('sp_CrearEquipo');

    const newId = result.recordset[0].id_equipo;

    res.status(201).json({ id_equipo: newId, nombre });
  } catch (err) {
    console.error('Error al crear equipo:', err);
    
    if (err.message && err.message.includes('ya existe')) {
      return res.status(409).json({ message: 'El equipo ya existe' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ver presupuesto de equipo
app.get('/api/equipos/:id/presupuesto', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Engineer solo puede ver su propio equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id)
      .execute('sp_ObtenerPresupuesto');

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al obtener presupuesto:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE PATROCINADORES
// =============================================

// Crear patrocinador (Admin o Engineer del equipo)
app.post('/api/patrocinadores', requireAuth, async (req, res) => {
  try {
    const { id_equipo, nombre } = req.body;

    if (!id_equipo || !nombre) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    // Engineer solo puede crear para su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .input('nombre', sql.VarChar(120), nombre)
      .execute('sp_CrearPatrocinador');

    const newId = result.recordset[0].id_patrocinador;

    res.status(201).json({ id_patrocinador: newId, id_equipo, nombre });
  } catch (err) {
    console.error('Error al crear patrocinador:', err);
    
    if (err.message && err.message.includes('ya existe')) {
      return res.status(409).json({ message: 'El patrocinador ya existe' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Listar patrocinadores
app.get('/api/patrocinadores', requireAuth, async (req, res) => {
  try {
    const { id_equipo } = req.query;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo || null)
      .execute('sp_ListarPatrocinadores');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar patrocinadores:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE APORTES
// =============================================

// Registrar aporte (Admin o Engineer del equipo)
app.post('/api/aportes', requireAuth, async (req, res) => {
  try {
    const { id_equipo, id_patrocinador, monto, descripcion } = req.body;

    if (!id_equipo || !id_patrocinador || !monto) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    // Engineer solo puede registrar aportes para su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .input('id_patrocinador', sql.Int, id_patrocinador)
      .input('monto', sql.Decimal(12, 2), monto)
      .input('descripcion', sql.VarChar(255), descripcion || null)
      .execute('sp_RegistrarAporte');

    const newId = result.recordset[0].id_aporte;

    res.status(201).json({ id_aporte: newId, id_equipo, id_patrocinador, monto, descripcion });
  } catch (err) {
    console.error('Error al registrar aporte:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Listar aportes de un equipo
app.get('/api/aportes/:id_equipo', requireAuth, async (req, res) => {
  try {
    const { id_equipo } = req.params;

    // Engineer solo puede ver aportes de su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .execute('sp_ListarAportes');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar aportes:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE COMPRAS (Ya las tienes, pero agregar autorización)
// =============================================

// Crear compra
app.post('/api/compras', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id_equipo } = req.body;

    // Engineer solo puede comprar para su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .output('id_compra', sql.Int)
      .execute('sp_compra_crear');

    const newId = result.output.id_compra;

    res.status(201).json({ id_compra: newId, id_equipo });
  } catch (err) {
    console.error('Error al crear compra:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Agregar item a compra
app.post('/api/compras/:id/items', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_parte, cantidad } = req.body;

    if (!id_parte || !cantidad) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('id_compra', sql.Int, id)
      .input('id_parte', sql.Int, id_parte)
      .input('cantidad', sql.Int, cantidad)
      .execute('sp_compra_agregar_item');

    res.json({ message: 'Item agregado exitosamente' });
  } catch (err) {
    console.error('Error al agregar item:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Confirmar compra
app.post('/api/compras/:id/confirmar', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_compra', sql.Int, id)
      .execute('sp_compra_confirmar');

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error al confirmar compra:', err);
    
    if (err.message && err.message.includes('Presupuesto insuficiente')) {
      return res.status(400).json({ message: 'Presupuesto insuficiente' });
    }
    if (err.message && err.message.includes('Stock insuficiente')) {
      return res.status(400).json({ message: 'Stock insuficiente en una o más partes' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ejecutar seed automático en primer inicio
(async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT COUNT(*) as count FROM dbo.USUARIO WHERE rol = 'Admin'");
    
    if (result.recordset[0].count === 0) {
      console.log('⚠️  No hay usuarios Admin. Ejecutando seed inicial...\n');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.request()
        .input('id_equipo', sql.Int, null)
        .input('nombre_usuario', sql.VarChar(80), 'admin')
        .input('nombre_completo', sql.VarChar(100), 'Administrador del Sistema')
        .input('rol', sql.VarChar(20), 'Admin')
        .input('contrasena_hash', sql.VarChar(255), hashedPassword)
        .execute('sp_CrearUsuario');
      
      console.log('✅ Usuario admin creado automáticamente');
      console.log('   Usuario: admin');
      console.log('   Contraseña: admin123\n');
    }
  } catch (err) {
    console.error('Error en seed automático:', err);
  }
})();

// =============================================
// INICIAR SERVIDOR
// =============================================

app.listen(PORT, () => {
  console.log(`
  ========================================
  🚀 API F1 Garage Manager
  ========================================
  🌐 Servidor: http://localhost:${PORT}
  📅 Fecha: ${new Date().toLocaleString()}
  ========================================
  `);
});