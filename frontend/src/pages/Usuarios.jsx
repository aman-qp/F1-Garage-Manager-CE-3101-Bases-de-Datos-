import { useState } from 'react'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: 'Admin', rol: 'Administrador' },
    { id: 2, nombre: 'Juan', rol: 'Jefe de Equipo' },
    { id: 3, nombre: 'Ana', rol: 'Usuario' }
  ])

  return (
    <div>
      <h2>Gestión de Usuarios</h2>

      <table border="1" cellPadding="8">
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
              <td>{usuario.nombre}</td>
              <td>{usuario.rol}</td>
              <td>
                <button>Editar</button>{' '}
                <button>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      <button
  onClick={() =>
    setUsuarios([
      ...usuarios,
      {
        id: usuarios.length + 1,
        nombre: 'Nuevo Usuario',
        rol: 'Usuario'
      }
    ])
  }
>
  Agregar Usuario
</button>

    </div>
  )
}
