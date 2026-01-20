import { useEffect, useState } from 'react'
import '../styles/usuarios.css'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [equipos, setEquipos] = useState([])

  // Modal CREAR
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    password: '',
    rol: '',
    id_equipo: ''
  })

  // Modal EDITAR
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    id: null,
    username: '',
    fullName: '',
    password: '', // opcional
    rol: '',
    id_equipo: ''
  })

  useEffect(() => {
    cargarUsuarios()
    cargarEquipos()
  }, [])

  async function cargarUsuarios() {
    try {
      const res = await fetch('http://localhost:3001/api/usuarios', {
        credentials: 'include'
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.message || 'Error al cargar usuarios')
        return
      }

      setUsuarios(
        data.map(u => ({
          id: u.id_usuario,
          nombre: u.nombre_usuario,
          nombreCompleto: u.nombre_completo,
          rol: u.rol,
          id_equipo: u.id_equipo,
          nombre_equipo: u.nombre_equipo
        }))
      )
    } catch (err) {
      console.error(err)
      alert('No se pudo conectar con el servidor')
    }
  }

  async function cargarEquipos() {
    try {
      const res = await fetch('http://localhost:3001/api/equipos', {
        credentials: 'include'
      })
      const data = await res.json()
      if (!res.ok) return
      setEquipos(data) // [{id_equipo, nombre}, ...]
    } catch (err) {
      console.error('Error cargando equipos:', err)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target

    setForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'rol' && value !== 'Engineer') next.id_equipo = ''
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.username || !form.fullName || !form.password || !form.rol) {
      alert('Todos los campos son obligatorios')
      return
    }

    if (form.rol === 'Engineer' && !form.id_equipo) {
      alert('El Ingeniero debe tener un equipo asignado')
      return
    }

    const payload = {
      nombre_usuario: form.username.trim(),
      nombre_completo: form.fullName.trim(),
      contrasena: form.password,
      rol: form.rol,
      id_equipo: form.rol === 'Engineer' ? Number(form.id_equipo) : null
    }

    try {
      const res = await fetch('http://localhost:3001/api/usuarios', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Error al crear usuario')
        return
      }

      await cargarUsuarios()

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

  // =========================
  // EDITAR
  // =========================
  function abrirEditar(u) {
    setEditForm({
      id: u.id,
      username: u.nombre || '',
      fullName: u.nombreCompleto || '',
      password: '',
      rol: u.rol || '',
      id_equipo: u.rol === 'Engineer' ? (u.id_equipo ?? '') : ''
    })
    setEditOpen(true)
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'rol' && value !== 'Engineer') next.id_equipo = ''
      return next
    })
  }

  async function guardarEdicion(e) {
    e.preventDefault()

    if (!editForm.username || !editForm.fullName || !editForm.rol) {
      alert('Faltan campos')
      return
    }
    if (editForm.rol === 'Engineer' && !editForm.id_equipo) {
      alert('El Ingeniero debe tener un equipo asignado')
      return
    }

    const payload = {
      nombre_usuario: editForm.username.trim(),
      nombre_completo: editForm.fullName.trim(),
      rol: editForm.rol,
      id_equipo: editForm.rol === 'Engineer' ? Number(editForm.id_equipo) : null
    }

    // contraseña opcional
    if (editForm.password && editForm.password.trim().length > 0) {
      payload.contrasena = editForm.password
    }

    try {
      const res = await fetch(`http://localhost:3001/api/usuarios/${editForm.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Error al guardar usuario')
        return
      }

      await cargarUsuarios()
      setEditOpen(false)
      alert('Usuario actualizado')
    } catch (err) {
      console.error(err)
      alert('No se pudo conectar con el servidor')
    }
  }

  // =========================
  // ELIMINAR
  // =========================
  async function eliminarUsuario(u) {
    const ok = confirm(`¿Eliminar usuario "${u.nombre}"?`)
    if (!ok) return

    try {
      const res = await fetch(`http://localhost:3001/api/usuarios/${u.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Error al eliminar usuario')
        return
      }

      await cargarUsuarios()
      alert('Usuario eliminado')
    } catch (err) {
      console.error(err)
      alert('No se pudo conectar con el servidor')
    }
  }

  return (
    <div className="usuarios-container">
      <table className="usuarios-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Usuario</th>
            <th>Nombre completo</th>
            <th>Rol</th>
            <th>Equipo</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {usuarios.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>
                No hay usuarios para mostrar
              </td>
            </tr>
          ) : (
            usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.nombre}</td>
                <td title={u.nombreCompleto || ''}>{u.nombreCompleto}</td>
                <td>{u.rol}</td>
                <td>
                  {u.rol === 'Engineer'
                    ? (u.nombre_equipo || `Equipo #${u.id_equipo}`)
                    : '-'}
                </td>
                <td>
                  <button className="btn btn-edit" onClick={() => abrirEditar(u)}>
                    Editar
                  </button>{' '}
                  <button className="btn btn-delete" onClick={() => eliminarUsuario(u)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <button className="btn-add" onClick={() => setModalOpen(true)}>
        + Agregar Usuario
      </button>

      {/* =========================
          MODAL CREAR
      ========================= */}
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
                  <option value="Admin">Administrador</option>
                  <option value="Engineer">Ingeniero</option>
                  <option value="Driver">Driver</option>
                </select>
              </label>

              {form.rol === 'Engineer' && (
                <label>
                  Equipo
                  <select
                    name="id_equipo"
                    value={form.id_equipo}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione un equipo</option>
                    {equipos.map(eq => (
                      <option key={eq.id_equipo} value={eq.id_equipo}>
                        {eq.nombre} (#{eq.id_equipo})
                      </option>
                    ))}
                  </select>
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

      {/* =========================
          MODAL EDITAR
      ========================= */}
      {editOpen && (
        <div className="modal-overlay" onClick={() => setEditOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Editar Usuario</h3>

            <form onSubmit={guardarEdicion} className="user-form">
              <label>
                Nombre de usuario
                <input
                  name="username"
                  value={editForm.username}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label>
                Nombre completo
                <input
                  name="fullName"
                  value={editForm.fullName}
                  onChange={handleEditChange}
                  required
                />
              </label>

              <label>
                Nueva contraseña (opcional)
                <input
                  type="password"
                  name="password"
                  value={editForm.password}
                  onChange={handleEditChange}
                />
              </label>

              <label>
                Rol
                <select name="rol" value={editForm.rol} onChange={handleEditChange} required>
                  <option value="">Seleccione un rol</option>
                  <option value="Admin">Administrador</option>
                  <option value="Engineer">Ingeniero</option>
                  <option value="Driver">Driver</option>
                </select>
              </label>

              {editForm.rol === 'Engineer' && (
                <label>
                  Equipo
                  <select
                    name="id_equipo"
                    value={editForm.id_equipo}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="">Seleccione un equipo</option>
                    {equipos.map(eq => (
                      <option key={eq.id_equipo} value={eq.id_equipo}>
                        {eq.nombre} (#{eq.id_equipo})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-add">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
