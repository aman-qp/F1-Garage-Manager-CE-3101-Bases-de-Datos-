import { useState } from 'react'
import Header from '../components/Header'
import '../styles/usuarios.css'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: 'Admin', rol: 'Administrador' },
    { id: 2, nombre: 'Juan', rol: 'Ingeniero' },
    { id: 3, nombre: 'Ana', rol: 'Driver' }
  ])

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
                      <td>{usuario.nombre}</td>
                      <td>{usuario.rol}</td>
                      <td>
                        <button className="btn btn-edit">Editar</button>{' '}
                        <button className="btn btn-delete">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                className="btn-add"
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
                + Agregar Usuario
              </button>
            </div>
          </div>
        )
}
