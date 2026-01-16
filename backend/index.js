const express = require('express')
const cors = require('cors')
const { sql, poolPromise } = require('./db')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

const VALID_ROLES = ['Admin', 'Engineer', 'Driver']

app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre_usuario, nombre_completo, contrasena, rol, id_equipo } = req.body

    if (!nombre_usuario || !nombre_completo || !contrasena || !rol) {
      return res.status(400).json({ message: 'Faltan campos requeridos' })
    }

    if (!VALID_ROLES.includes(rol)) {
      return res.status(400).json({ message: 'Rol inválido' })
    }

    if (rol === 'Engineer' && (id_equipo === undefined || id_equipo === null)) {
      return res.status(400).json({ message: 'id_equipo requerido para Engineer' })
    }

    const pool = await poolPromise

    // Verifica si nombre_usuario ya existe
    const check = await pool.request()
      .input('nombre_usuario', sql.VarChar(80), nombre_usuario)
      .query('SELECT COUNT(*) as cnt FROM dbo.USUARIO WHERE nombre_usuario = @nombre_usuario')

    if (check.recordset[0].cnt > 0) {
      return res.status(409).json({ message: 'nombre_usuario ya existe' })
    }

    // Insertar
    const insert = await pool.request()
      .input('id_equipo', sql.Int, id_equipo || null)
      .input('nombre_usuario', sql.VarChar(80), nombre_usuario)
      .input('nombre_completo', sql.VarChar(100), nombre_completo)
      .input('rol', sql.VarChar(20), rol)
      .input('contrasena_hash', sql.VarChar(255), contrasena)
      .query(`INSERT INTO dbo.USUARIO (id_equipo, nombre_usuario, nombre_completo, rol, contrasena_hash)
              VALUES (@id_equipo, @nombre_usuario, @nombre_completo, @rol, @contrasena_hash);
              SELECT SCOPE_IDENTITY() as id;`)

    const newId = insert.recordset[0].id

    return res.status(201).json({ id: newId, nombre_usuario, nombre_completo, rol, id_equipo: id_equipo || null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
})

app.listen(PORT, () => console.log(`API escuchando en el puerto ${PORT}`))
