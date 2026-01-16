const bcrypt = require('bcrypt');
const { sql, poolPromise } = require('./db');

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...\n');

    const pool = await poolPromise;

    // =============================================
    // 1. CREAR USUARIO ADMIN POR DEFECTO
    // =============================================
    console.log('👤 Verificando usuario admin...');
    
    const checkAdmin = await pool.request()
      .input('nombre_usuario', sql.VarChar(80), 'admin')
      .query('SELECT COUNT(*) as count FROM dbo.USUARIO WHERE nombre_usuario = @nombre_usuario');

    if (checkAdmin.recordset[0].count === 0) {
      console.log('   ⚠️  No existe usuario admin. Creando...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.request()
        .input('id_equipo', sql.Int, null)
        .input('nombre_usuario', sql.VarChar(80), 'admin')
        .input('nombre_completo', sql.VarChar(100), 'Administrador del Sistema')
        .input('rol', sql.VarChar(20), 'Admin')
        .input('contrasena_hash', sql.VarChar(255), hashedPassword)
        .execute('sp_CrearUsuario');
      
      console.log('   ✅ Usuario admin creado exitosamente');
      console.log('      Usuario: admin');
      console.log('      Contraseña: admin123');
    } else {
      console.log('   ✅ Usuario admin ya existe');
    }

    // =============================================
    // 2. CREAR EQUIPOS DE EJEMPLO (OPCIONAL)
    // =============================================
    console.log('\n🏎️  Verificando equipos de ejemplo...');
    
    const equiposEjemplo = [
      'Red Bull Racing',
      'Mercedes-AMG Petronas',
      'Scuderia Ferrari',
      'McLaren F1 Team'
    ];

    for (const nombreEquipo of equiposEjemplo) {
      const checkEquipo = await pool.request()
        .input('nombre', sql.VarChar(100), nombreEquipo)
        .query('SELECT COUNT(*) as count FROM dbo.EQUIPO WHERE nombre = @nombre');

      if (checkEquipo.recordset[0].count === 0) {
        await pool.request()
          .input('nombre', sql.VarChar(100), nombreEquipo)
          .execute('sp_CrearEquipo');
        console.log(`   ✅ Equipo creado: ${nombreEquipo}`);
      } else {
        console.log(`   ⏭️  Equipo ya existe: ${nombreEquipo}`);
      }
    }

    // =============================================
    // 3. NOTAS SOBRE CONFIGURACIÓN
    // =============================================
    console.log('\n📝 Nota: La tabla CONFIGURACION debe crearse manualmente en SSMS');
    console.log('   (api_user no tiene permisos para CREATE TABLE)');

    // =============================================
    // RESUMEN FINAL
    // =============================================
    console.log('\n========================================');
    console.log('✅ Seed completado exitosamente');
    console.log('========================================');
    console.log('📋 CREDENCIALES DE ACCESO:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin123');
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  }
}

// Ejecutar seed
seedDatabase();