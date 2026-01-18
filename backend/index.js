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
// RUTA DE CATÁLOGO DE PARTES (ADMIN)
// =============================================

// GET /api/partes - Obtener todas las partes del catálogo
app.get('/api/partes', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`
        SELECT 
          p.id_parte,
          p.nombre,
          c.tipo_de_parte as categoria,
          p.precio_catalogo as precio,
          p.stock,
          p.potencia as P,
          p.aerodinamica as A,
          p.manejo as M
        FROM dbo.PARTE p
        JOIN dbo.CATEGORIA c ON c.id_categoria = p.id_categoria
        ORDER BY c.tipo_de_parte, p.nombre
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener partes:', err);
    res.status(500).json({ message: 'Error al obtener catálogo de partes' });
  }
});

// POST /api/partes - Crear nueva parte
app.post('/api/partes', requireRole('Admin'), async (req, res) => {
  try {
    const { nombre, id_categoria, potencia, aerodinamica, manejo, precio_catalogo, stock } = req.body;

    // Validaciones
    if (!nombre || !id_categoria || potencia === undefined || aerodinamica === undefined || 
        manejo === undefined || !precio_catalogo || stock === undefined) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    if (potencia < 0 || potencia > 9 || aerodinamica < 0 || aerodinamica > 9 || 
        manejo < 0 || manejo > 9) {
      return res.status(400).json({ message: 'P, A y M deben estar entre 0 y 9' });
    }

    if (id_categoria < 1 || id_categoria > 5) {
      return res.status(400).json({ message: 'Categoría debe estar entre 1 y 5' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('nombre', sql.VarChar(120), nombre)
      .input('id_categoria', sql.Int, id_categoria)
      .input('potencia', sql.Int, potencia)
      .input('aerodinamica', sql.Int, aerodinamica)
      .input('manejo', sql.Int, manejo)
      .input('precio_catalogo', sql.Decimal(12, 2), precio_catalogo)
      .input('stock', sql.Int, stock)
      .query(`
        INSERT INTO dbo.PARTE (nombre, id_categoria, potencia, aerodinamica, manejo, precio_catalogo, stock)
        VALUES (@nombre, @id_categoria, @potencia, @aerodinamica, @manejo, @precio_catalogo, @stock);
        SELECT SCOPE_IDENTITY() as id_parte;
      `);

    res.status(201).json({ 
      message: 'Parte creada exitosamente',
      id_parte: result.recordset[0].id_parte 
    });
  } catch (err) {
    console.error('Error al crear parte:', err);
    res.status(500).json({ message: 'Error al crear parte' });
  }
});

// PUT /api/partes/:id - Actualizar parte
app.put('/api/partes/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, id_categoria, potencia, aerodinamica, manejo, precio_catalogo, stock } = req.body;

    // Validaciones
    if (potencia < 0 || potencia > 9 || aerodinamica < 0 || aerodinamica > 9 || 
        manejo < 0 || manejo > 9) {
      return res.status(400).json({ message: 'P, A y M deben estar entre 0 y 9' });
    }

    const pool = await poolPromise;
    await pool.request()
      .input('id_parte', sql.Int, id)
      .input('nombre', sql.VarChar(120), nombre)
      .input('id_categoria', sql.Int, id_categoria)
      .input('potencia', sql.Int, potencia)
      .input('aerodinamica', sql.Int, aerodinamica)
      .input('manejo', sql.Int, manejo)
      .input('precio_catalogo', sql.Decimal(12, 2), precio_catalogo)
      .input('stock', sql.Int, stock)
      .query(`
        UPDATE dbo.PARTE
        SET nombre = @nombre,
            id_categoria = @id_categoria,
            potencia = @potencia,
            aerodinamica = @aerodinamica,
            manejo = @manejo,
            precio_catalogo = @precio_catalogo,
            stock = @stock
        WHERE id_parte = @id_parte
      `);

    res.json({ message: 'Parte actualizada exitosamente' });
  } catch (err) {
    console.error('Error al actualizar parte:', err);
    res.status(500).json({ message: 'Error al actualizar parte' });
  }
});

// DELETE /api/partes/:id - Eliminar parte
app.delete('/api/partes/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    await pool.request()
      .input('id_parte', sql.Int, id)
      .query('DELETE FROM dbo.PARTE WHERE id_parte = @id_parte');

    res.json({ message: 'Parte eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar parte:', err);
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(400).json({ 
        message: 'No se puede eliminar: la parte está siendo usada en inventarios o instalaciones' 
      });
    }
    res.status(500).json({ message: 'Error al eliminar parte' });
  }
});

// DELETE /api/partes/:id - Eliminar parte
app.delete('/api/partes/:id', requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const pool = await poolPromise;
    await pool.request()
      .input('id_parte', sql.Int, id)
      .query('DELETE FROM dbo.PARTE WHERE id_parte = @id_parte');

    res.json({ message: 'Parte eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar parte:', err);
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(400).json({ 
        message: 'No se puede eliminar: la parte está siendo usada en inventarios o instalaciones' 
      });
    }
    res.status(500).json({ message: 'Error al eliminar parte' });
  }
});

// GET /api/categorias - Obtener categorías (para el formulario)
app.get('/api/categorias', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .query('SELECT id_categoria, tipo_de_parte FROM dbo.CATEGORIA ORDER BY id_categoria');
    
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
    
    // Engineer solo puede ver su propio inventario
    if (req.session.rol === 'Engineer' && req.session.id_equipo != id_equipo) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
      .input('id_equipo', sql.Int, id_equipo)
      .query(`
        SELECT 
          t.id_equipo,
          t.id_parte,
          pa.nombre as nombre_parte,
          c.tipo_de_parte as categoria,
          t.cantidad,
          t.fecha_adquirido as fecha_adquisicion,
          pa.potencia as p,
          pa.aerodinamica as a,
          pa.manejo as m
        FROM dbo.TIENE t
        JOIN dbo.PARTE pa ON pa.id_parte = t.id_parte
        JOIN dbo.CATEGORIA c ON c.id_categoria = pa.id_categoria
        WHERE t.id_equipo = @id_equipo
          AND t.cantidad > 0
        ORDER BY c.tipo_de_parte, pa.nombre
      `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error al obtener inventario:', err);
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