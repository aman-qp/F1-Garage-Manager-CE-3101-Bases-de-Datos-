import { useState } from 'react'
import '../styles/usuarios.css'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([
  ])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ username: '', fullName: '', password: '', rol: '', id_equipo: '' })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }
  async function handleSubmit(e) {
  e.preventDefault()

  // 1. Validación básica
  if (!form.username || !form.fullName || !form.password || !form.rol) {
    alert('Todos los campos son obligatorios')
    return
  }

  // 2. Validación específica por rol
  if (form.rol === 'Engineer' && !form.id_equipo) {
    alert('El Ingeniero debe tener un equipo asignado')
    return
  }

  // 3. Payload limpio
  const payload = {
    nombre_usuario: form.username.trim(),
    nombre_completo: form.fullName.trim(),
    contrasena: form.password,
    rol: form.rol,
    id_equipo: form.id_equipo ? Number(form.id_equipo) : null
  }

  try {
    const res = await fetch('http://localhost:3001/api/usuarios', {
      method: 'POST',
      credentials: 'include', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message || 'Error al crear usuario')
      return
    }

    // 4. Agregar a la tabla
    setUsuarios(prev => [
      ...prev,
      {
        id: data.id,
        nombre: data.nombre_usuario,
        nombreCompleto: data.nombre_completo,
        rol: data.rol
      }
    ])

    // 5. Limpiar formulario y cerrar modal
    setForm({
      username: '',
      fullName: '',
      password: '',
      rol: '',
      id_equipo: ''
    })

    setModalOpen(false)

    alert('Usuario creado correctamente. Ya puede iniciar sesión.')

  } catch (err) {
    console.error(err)
    alert('No se pudo conectar con el servidor')
  }
}

  return (
    <div>
      

      <div className="usuarios-container">
        <table className="usuarios-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {usuarios.map(usuario => (
              <tr key={usuario.id}>
                <td>{usuario.id}</td>
                <td title={usuario.nombreCompleto || ''}>{usuario.nombre}</td>
                <td>{usuario.rol}</td>
                <td>
                  <button className="btn btn-edit">Editar</button>{' '}
                  <button className="btn btn-delete">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn-add" onClick={() => setModalOpen(true)}>
          + Agregar Usuario
        </button>

        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Agregar Usuario</h3>
              <form onSubmit={handleSubmit} className="user-form">
                <label>
                  Nombre de usuario
                  <input
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Nombre completo
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Contraseña
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Rol
                  <select name="rol" value={form.rol} onChange={handleChange} required>
                    <option value="">Seleccione un rol</option>
                    <option value="Engineer">Ingeniero</option>
                    <option value="Driver">Conductor</option>
                  </select>
                </label>


                {form.rol === 'Engineer' && (
                  <label>
                    id_equipo
                    <input
                      name="id_equipo"
                      value={form.id_equipo}
                      onChange={handleChange}
                      type="number"
                      required
                    />
                  </label>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-add">
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
