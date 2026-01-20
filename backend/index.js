const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcrypt');
const MSSQLStore = require('connect-mssql-v2');
require('dotenv').config();

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
const sessionStore = new MSSQLStore({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,      
  database: process.env.DB_NAME,     
  options: {
    encrypt: false,                   
    trustServerCertificate: true      
  },
  table: 'SESSIONS'                   
});

app.use(session({
  name: 'sid', 
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,                
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60
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

    // guarda la sesion
    req.session.save(err => {
      if (err) {
        console.error('Error al guardar sesión:', err);
        return res.status(500).json({ message: 'Error al crear sesión' });
      }

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
    });
  } catch (err) {
    console.error('Error al hacer login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Error al cerrar sesión' });
    }
    res.clearCookie('sid');
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

// Actualizar usuario (Admin only)
app.put('/api/usuarios/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_usuario, nombre_completo, rol, id_equipo, contrasena } = req.body;

    if (!nombre_usuario || !nombre_completo || !rol) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    if (!VALID_ROLES.includes(rol)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    const pool = await poolPromise;

    // Si viene contraseña, la hasheamos; si no, se mantiene
    let hashedPassword = null;
    if (contrasena && String(contrasena).trim().length > 0) {
      hashedPassword = await bcrypt.hash(contrasena, 10);
    }

    await pool.request()
      .input('id_usuario', sql.Int, Number(id))
      .input('id_equipo', sql.Int, rol === 'Engineer' ? (id_equipo ?? null) : null)
      .input('nombre_usuario', sql.VarChar(80), nombre_usuario)
      .input('nombre_completo', sql.VarChar(100), nombre_completo)
      .input('rol', sql.VarChar(20), rol)
      .input('contrasena_hash', sql.VarChar(255), hashedPassword) // puede ser null
      .execute('sp_ActualizarUsuario');

    res.json({ message: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);

    if (err.message && err.message.includes('ya existe')) {
      return res.status(409).json({ message: err.message });
    }

    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar usuario (Admin only)
app.delete('/api/usuarios/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_usuario', sql.Int, Number(id))
      .execute('dbo.sp_EliminarUsuario');

    const mensaje = result?.recordset?.[0]?.mensaje;

    res.json({ message: mensaje || 'Usuario eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);

    if (err.message && err.message.includes('asignado a un carro')) {
      return res.status(400).json({
        message: 'No se puede eliminar: el conductor está asignado a un carro'
      });
    }

    if (err.message && err.message.includes('no existe')) {
      return res.status(404).json({ message: 'El usuario no existe' });
    }

    res.status(500).json({ message: 'Error interno del servidor' });
  }
});



// ===============================
// PERFIL DEL CONDUCTOR (DRIVER)
// ===============================
app.get('/api/conductor/me', requireRole('Driver'), async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_usuario', sql.Int, req.session.userId)
      .execute('sp_ObtenerPerfilDriver');

    // Resultado tiene 3 recordsets: perfil, resultados, estadísticas
    res.json({
      perfil: result.recordsets[0][0] || null,
      resultados: result.recordsets[1] || [],
      estadisticas: result.recordsets[2][0] || {
        total_carreras: 0,
        posicion_promedio: 0,
        mejor_posicion: null,
        victorias: 0,
        podios: 0
      }
    });
  } catch (error) {
    console.error('Error perfil conductor:', error);
    res.status(500).json({ message: 'Error al obtener perfil del conductor' });
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

// Actualizar equipo (Admin only)
app.put('/api/equipos/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('id_equipo', sql.Int, Number(id))
      .input('nombre', sql.VarChar(100), nombre)
      .execute('sp_ActualizarEquipo');

    res.json({ message: 'Equipo actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar equipo:', err);

    if (err.message && err.message.includes('Ya existe')) {
      return res.status(409).json({ message: 'El nombre del equipo ya existe' });
    }

    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar equipo (Admin only)
app.delete('/api/equipos/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    await pool.request()
      .input('id_equipo', sql.Int, Number(id))
      .execute('sp_EliminarEquipo');

    res.json({ message: 'Equipo eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar equipo:', err);

    // Mensaje de SP (por si está “en uso”)
    if (err.message && err.message.includes('No se puede eliminar')) {
      return res.status(400).json({ message: err.message });
    }

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
// RUTA DE CATÁLOGO DE PARTES (ADMIN) - CON SP
// =============================================

// GET /api/partes
app.get('/api/partes', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .execute('dbo.SP_Partes_Listar');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener partes:', err);
    res.status(500).json({ message: 'Error al obtener catálogo de partes' });
  }
});

// POST /api/partes
app.post('/api/partes', requireRole('Admin'), async (req, res) => {
  try {
    const { nombre, id_categoria, potencia, aerodinamica, manejo, precio_catalogo, stock } = req.body;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', sql.VarChar(120), nombre)
      .input('id_categoria', sql.Int, id_categoria)
      .input('potencia', sql.Int, potencia)
      .input('aerodinamica', sql.Int, aerodinamica)
      .input('manejo', sql.Int, manejo)
      .input('precio_catalogo', sql.Decimal(12,2), precio_catalogo)
      .input('stock', sql.Int, stock)
      .execute('dbo.SP_Partes_Insertar');

    res.status(201).json({
      message: 'Parte creada exitosamente',
      id_parte: result.recordset[0].id_parte
    });
  } catch (err) {
    console.error('Error al crear parte:', err);
    res.status(500).json({ message: 'Error al crear parte' });
  }
});

// PUT /api/partes/:id
app.put('/api/partes/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, id_categoria, potencia, aerodinamica, manejo, precio_catalogo, stock } = req.body;

    const pool = await poolPromise;
    await pool.request()
      .input('id_parte', sql.Int, id)
      .input('nombre', sql.VarChar(120), nombre)
      .input('id_categoria', sql.Int, id_categoria)
      .input('potencia', sql.Int, potencia)
      .input('aerodinamica', sql.Int, aerodinamica)
      .input('manejo', sql.Int, manejo)
      .input('precio_catalogo', sql.Decimal(12,2), precio_catalogo)
      .input('stock', sql.Int, stock)
      .execute('dbo.SP_Partes_Actualizar');

    res.json({ message: 'Parte actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar parte:', err);
    res.status(500).json({ message: 'Error al actualizar parte' });
  }
});

// DELETE /api/partes/:id
app.delete('/api/partes/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    await pool.request()
      .input('id_parte', sql.Int, id)
      .execute('dbo.SP_Partes_Eliminar');

    res.json({ message: 'Parte eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar parte:', err);
    if (err.message.includes('REFERENCE')) {
      return res.status(400).json({
        message: 'No se puede eliminar: la parte está en uso'
      });
    }
    res.status(500).json({ message: 'Error al eliminar parte' });
  }
});

// GET /api/categorias
app.get('/api/categorias', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .execute('dbo.SP_Categorias_Listar');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener categorías:', err);
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
});


// =============================================
// RUTAS DE COMPRAS E INVENTARIO
// =============================================

// GET /api/inventario/:id_equipo - Obtener inventario de un equipo
app.get('/api/inventario/:id_equipo', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id_equipo } = req.params;

    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, Number(id_equipo))
      .execute('dbo.sp_ObtenerInventarioEquipo');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener inventario:', err);

    if (err.message && err.message.includes('El equipo no existe')) {
      return res.status(404).json({ message: 'El equipo no existe' });
    }

    res.status(500).json({ message: 'Error al obtener inventario' });
  }
});


// POST /api/compras - Flujo completo de compra (crear + agregar + confirmar)
app.post('/api/compras', requireRole('Admin', 'Engineer'), async (req, res) => {
  const { id_equipo, id_parte, cantidad } = req.body;

  // Validaciones básicas
  if (!id_equipo || !id_parte || !cantidad) {
    return res.status(400).json({ 
      message: 'Faltan datos: id_equipo, id_parte y cantidad son obligatorios' 
    });
  }

  if (cantidad <= 0) {
    return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
  }

  // Engineer solo puede comprar para su equipo
  if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  let transaction;

  try {
    const pool = await poolPromise;
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // PASO 1: Crear compra vacía
    const crearResult = await transaction.request()
      .input('id_equipo', sql.Int, id_equipo)
      .output('id_compra', sql.Int)
      .execute('dbo.sp_compra_crear');

    const id_compra = crearResult.output.id_compra;

    if (!id_compra) {
      await transaction.rollback();
      return res.status(500).json({ message: 'Error al crear la compra' });
    }

    // PASO 2: Agregar item al carrito
    await transaction.request()
      .input('id_compra', sql.Int, id_compra)
      .input('id_parte', sql.Int, id_parte)
      .input('cantidad', sql.Int, cantidad)
      .execute('dbo.sp_compra_agregar_item');

    // PASO 3: Confirmar compra (valida presupuesto, stock, actualiza todo)
    const confirmarResult = await transaction.request()
      .input('id_compra', sql.Int, id_compra)
      .execute('dbo.sp_compra_confirmar');

    await transaction.commit();

    // Obtener detalles de la compra confirmada
    const resumen = confirmarResult.recordset[0];

    res.json({
      success: true,
      message: 'Compra realizada exitosamente',
      compra: {
        id_compra: resumen.id_compra,
        id_equipo: resumen.id_equipo,
        precio_total: resumen.precio_total
      }
    });

  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Error al hacer rollback:', rollbackErr);
      }
    }

    console.error('Error en compra:', err);

    // Manejar errores específicos de los stored procedures
    if (err.message && err.message.includes('Presupuesto insuficiente')) {
      return res.status(400).json({ 
        message: 'Presupuesto insuficiente para completar la compra' 
      });
    }
    
    if (err.message && err.message.includes('Stock insuficiente')) {
      return res.status(400).json({ 
        message: 'Stock insuficiente en el catálogo' 
      });
    }

    if (err.message && err.message.includes('El equipo no existe')) {
      return res.status(404).json({ message: 'El equipo no existe' });
    }

    if (err.message && err.message.includes('La parte no existe')) {
      return res.status(404).json({ message: 'La parte no existe' });
    }

    res.status(500).json({ 
      message: 'Error al procesar la compra',
      error: err.message 
    });
  }
});
// Ejecutar seed automático en primer inicio
(async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query("SELECT COUNT(*) as count FROM dbo.USUARIO WHERE rol = 'Admin'");
    
    if (result.recordset[0].count === 0) {
      console.log('No hay usuarios Admin. Ejecutando seed inicial...\n');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.request()
        .input('id_equipo', sql.Int, null)
        .input('nombre_usuario', sql.VarChar(80), 'admin')
        .input('nombre_completo', sql.VarChar(100), 'Administrador del Sistema')
        .input('rol', sql.VarChar(20), 'Admin')
        .input('contrasena_hash', sql.VarChar(255), hashedPassword)
        .execute('sp_CrearUsuario');
      
      console.log('   Usuario admin creado automáticamente');
      console.log('   Usuario: admin');
      console.log('   Contraseña: admin123\n');
    }
  } catch (err) {
    console.error('Error en seed automático:', err);
  }
})();

// =============================================
// RUTAS DE CONDUCTORES
// =============================================

// Listar todos los conductores
app.get('/api/conductores', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const pool = await poolPromise;

    const id_equipo =
      req.session.rol === 'Engineer'
        ? req.session.id_equipo
        : (req.query.id_equipo ? Number(req.query.id_equipo) : null);

    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .execute('sp_ListarConductores');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar conductores:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Listar usuarios Driver disponibles (sin ser conductores)
app.get('/api/conductores/disponibles', requireRole('Admin'), async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .execute('sp_ListarDriversDisponibles');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar drivers disponibles:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear conductor
app.post('/api/conductores', requireRole('Admin'), async (req, res) => {
  try {
    const { id_usuario, id_equipo, habilidad_h } = req.body;

    if (!id_usuario || !id_equipo || habilidad_h === undefined) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('id_usuario', sql.Int, id_usuario)
      .input('id_equipo', sql.Int, id_equipo)
      .input('habilidad_h', sql.Int, habilidad_h)
      .execute('sp_CrearConductor');

    res.status(201).json({ message: 'Conductor creado exitosamente' });
  } catch (err) {
    console.error('Error al crear conductor:', err);
    
    if (err.message && err.message.includes('ya está registrado')) {
      return res.status(409).json({ message: 'Este usuario ya es conductor' });
    }
    if (err.message && err.message.includes('no es Driver')) {
      return res.status(400).json({ message: 'El usuario debe tener rol Driver' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar conductor
app.put('/api/conductores/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_equipo, habilidad_h } = req.body;

    if (!id_equipo || habilidad_h === undefined) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    // Engineer solo puede actualizar conductores de su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('id_conductor', sql.Int, id)
      .input('id_equipo', sql.Int, id_equipo)
      .input('habilidad_h', sql.Int, habilidad_h)
      .execute('sp_ActualizarConductor');

    res.json({ message: 'Conductor actualizado exitosamente' });
  } catch (err) {
    console.error('Error al actualizar conductor:', err);
    
    if (err.message && err.message.includes('asignado a un carro')) {
      return res.status(400).json({ message: 'No se puede cambiar de equipo: el conductor está en un carro' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar conductor
app.delete('/api/conductores/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    await pool.request()
      .input('id_conductor', sql.Int, id)
      .execute('sp_EliminarConductor');

    res.json({ message: 'Conductor eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar conductor:', err);
    
    if (err.message && err.message.includes('asignado a un carro')) {
      return res.status(400).json({ message: 'No se puede eliminar: el conductor está en un carro' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE ARMADO DE CARROS
// =============================================

// Crear carro
app.post('/api/carros', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id_equipo } = req.body;

    if (!id_equipo) {
      return res.status(400).json({ message: 'id_equipo es requerido' });
    }

    // Engineer solo puede crear carros para su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .execute('sp_CrearCarro');

    const newId = result.recordset[0].id_carro;

    res.status(201).json({ id_carro: newId, id_equipo, estado: 'Armando' });
  } catch (err) {
    console.error('Error al crear carro:', err);
    
    if (err.message && err.message.includes('máximo de 2 carros')) {
      return res.status(400).json({ message: 'El equipo ya tiene el máximo de 2 carros' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Listar carros de un equipo
app.get('/api/carros/equipo/:id_equipo', requireAuth, async (req, res) => {
  try {
    const { id_equipo } = req.params;

    // Engineer solo puede ver carros de su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .execute('sp_ListarCarros');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar carros:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener setup completo de un carro
app.get('/api/carros/:id/setup', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_carro', sql.Int, Number(id))
      .execute('sp_ObtenerSetupCarro');

    const carroInfo = result.recordsets?.[0]?.[0] || null;

    if (!carroInfo) {
      return res.status(404).json({ message: 'El carro no existe' });
    }

    if (req.session.rol === 'Engineer' && Number(carroInfo.id_equipo) !== Number(req.session.id_equipo)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    res.json({
      carro: carroInfo,
      partes: result.recordsets[1] || [],
      totales: result.recordsets[2]?.[0] || {
        total_potencia: 0,
        total_aerodinamica: 0,
        total_manejo: 0
      }
    });
  } catch (err) {
    console.error('Error al obtener setup:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// Listar partes disponibles del inventario por categoría
app.get('/api/inventario/:id_equipo/categoria/:id_categoria', requireAuth, async (req, res) => {
  try {
    const { id_equipo, id_categoria } = req.params;

    // Engineer solo puede ver inventario de su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .input('id_categoria', sql.Int, id_categoria)
      .execute('sp_ListarInventarioPorCategoria');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar inventario por categoría:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Instalar/Reemplazar parte en un carro
app.post('/api/carros/:id/instalar', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_categoria, id_parte } = req.body;

    if (!id_categoria || !id_parte) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_carro', sql.Int, id)
      .input('id_categoria', sql.Int, id_categoria)
      .input('id_parte', sql.Int, id_parte)
      .execute('sp_InstalarParte');

    res.json({ message: 'Parte instalada exitosamente' });
  } catch (err) {
    console.error('Error al instalar parte:', err);
    
    if (err.message && err.message.includes('no está disponible')) {
      return res.status(400).json({ message: 'La parte no está disponible en el inventario' });
    }
    if (err.message && err.message.includes('Armando')) {
      return res.status(400).json({ message: 'Solo se pueden modificar carros en estado Armando' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Listar conductores disponibles del equipo
app.get('/api/equipos/:id/conductores', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Engineer solo puede ver conductores de su equipo
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id)
      .execute('sp_ListarConductoresDisponibles');

    res.json(result.recordset);
  } catch (err) {
    console.error('Error al listar conductores:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Asignar conductor al carro
app.put('/api/carros/:id/conductor', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { id_conductor } = req.body;

    if (!id_conductor) {
      return res.status(400).json({ message: 'id_conductor es requerido' });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('id_carro', sql.Int, id)
      .input('id_conductor', sql.Int, id_conductor)
      .execute('sp_AsignarConductor');

    res.json({ message: 'Conductor asignado exitosamente' });
  } catch (err) {
    console.error('Error al asignar conductor:', err);
    
    if (err.message && err.message.includes('ya está asignado')) {
      return res.status(400).json({ message: 'El conductor ya está asignado a otro carro' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Finalizar carro
app.post('/api/carros/:id/finalizar', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    await pool.request()
      .input('id_carro', sql.Int, id)
      .execute('sp_FinalizarCarro');

    res.json({ message: 'Carro finalizado exitosamente' });
  } catch (err) {
    console.error('Error al finalizar carro:', err);
    
    if (err.message && err.message.includes('5 categorías')) {
      return res.status(400).json({ message: 'El carro debe tener las 5 categorías instaladas' });
    }
    if (err.message && err.message.includes('conductor asignado')) {
      return res.status(400).json({ message: 'El carro debe tener un conductor asignado' });
    }
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar carro (Admin, Engineer)
app.delete('/api/carros/:id', requireRole('Admin', 'Engineer'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_carro', sql.Int, Number(id))
      .execute('dbo.sp_EliminarCarro');

    // por si querés devolver el mensaje del SP
    const mensaje = result?.recordset?.[0]?.mensaje;

    res.json({ message: mensaje || 'Carro eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar carro:', err);

    if (err.message && err.message.includes('simulaciones')) {
      return res.status(400).json({
        message: 'No se puede eliminar: el carro ha participado en simulaciones'
      });
    }

    if (err.message && err.message.includes('no existe')) {
      return res.status(404).json({ message: 'El carro no existe' });
    }

    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// =============================================
// INICIAR SERVIDOR
// =============================================

app.listen(PORT, () => {
  console.log(`
  ========================================
  API F1 Garage Manager
  ========================================
  Servidor: http://localhost:${PORT}
  Fecha: ${new Date().toLocaleString()}
  ========================================
  `);
});