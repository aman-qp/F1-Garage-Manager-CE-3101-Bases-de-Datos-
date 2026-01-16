import { useState } from 'react'
import Header from '../components/Header'
import '../styles/usuarios.css'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([
    /*{ id: 1, nombre: 'Admin', rol: 'Administrador' },
    { id: 2, nombre: 'Juan', rol: 'Ingeniero' },
    { id: 3, nombre: 'Ana', rol: 'Driver' }*/
    //Comento los precargados para iniciar con la tabla vacía
  ])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ username: '', fullName: '', password: '', rol: '', id_equipo: '' })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username || !form.fullName || !form.password || !form.rol) return

    const payload = {
      nombre_usuario: form.username,
      nombre_completo: form.fullName,
      contrasena: form.password,
      rol: form.rol
    }

    if (form.rol === 'Engineer') {
      if (!form.id_equipo) {
        alert('id_equipo es requerido para rol Engineer')
        return
      }
      payload.id_equipo = Number(form.id_equipo)
    }

    try {
      const res = await fetch('http://localhost:3001/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.status === 409) {
        const data = await res.json()
        alert(data.message || 'El nombre de usuario ya existe')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.message || 'Error al registrar usuario')
        return
      }

      const created = await res.json()
      setUsuarios(prev => [
        ...prev,
        { id: created.id, nombre: created.nombre_usuario || form.username, nombreCompleto: created.nombre_completo || form.fullName, rol: created.rol }
      ])

      setForm({ username: '', fullName: '', password: '', rol: '', id_equipo: '' })
      setModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('No se pudo conectar con la API')
    }
  }

  return (
    <div>
      <Header />

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
                  <input name="rol" value={form.rol} onChange={handleChange} required />
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
