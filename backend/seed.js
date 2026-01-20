const bcrypt = require('bcrypt');
const { sql, poolPromise } = require('./db');

async function seedDatabase() {
  try {

    const pool = await poolPromise;

    //  CREAR USUARIO ADMIN POR DEFECTO
    console.log(' Verificando usuario admin...');
    
    const checkAdmin = await pool.request()
      .input('nombre_usuario', sql.VarChar(80), 'admin')
      .query('SELECT COUNT(*) as count FROM dbo.USUARIO WHERE nombre_usuario = @nombre_usuario');

    if (checkAdmin.recordset[0].count === 0) {
      console.log('      No existe usuario admin. Creando...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await pool.request()
        .input('id_equipo', sql.Int, null)
        .input('nombre_usuario', sql.VarChar(80), 'admin')
        .input('nombre_completo', sql.VarChar(100), 'Administrador del Sistema')
        .input('rol', sql.VarChar(20), 'Admin')
        .input('contrasena_hash', sql.VarChar(255), hashedPassword)
        .execute('sp_CrearUsuario');
      
      console.log('      Usuario admin creado exitosamente');
      console.log('      Usuario: admin');
      console.log('      Contraseña: admin123');
    } else {
      console.log('      Usuario admin ya existe');
    }

    // RESULTADO
    console.log('\n===============================');
    console.log('Seed completado exitosamente');
    console.log('=================================');
    console.log('CREDENCIALES DE ACCESO:');
    console.log('Usuario: admin');
    console.log('Contraseña: admin123');
    console.log('=================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error en seed:', err);
    process.exit(1);
  }
}


seedDatabase();