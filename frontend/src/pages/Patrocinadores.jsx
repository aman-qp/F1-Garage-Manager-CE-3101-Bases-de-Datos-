import { useState } from 'react'
import '../styles/usuarios.css'
export default function Patrocinadores() {
  const [patrocinadores, setPatrocinadores] = useState([
    {
      id: 1,
      nombre: 'Red Bull',
      contacto: 'contacto@redbull.com'
    },
    {
      id: 2,
      nombre: 'Shell',
      contacto: 'info@shell.com'
    }
  ])

  const agregarPatrocinador = () => {
    setPatrocinadores([
      ...patrocinadores,
      {
        id: patrocinadores.length + 1,
        nombre: 'Nuevo Patrocinador',
        contacto: 'correo@ejemplo.com'
      }
    ])
  }

 return (
    <div className="usuarios-container">
      <h2 className="view-title">Patrocinadores</h2>

      <table className="usuarios-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Contacto</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {patrocinadores.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.nombre}</td>
              <td>{p.contacto}</td>
              <td>
                <button className="btn btn-edit">Editar</button>{' '}
                <button className="btn btn-delete">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="btn btn-add" onClick={agregarPatrocinador}>
        + Agregar Patrocinador
      </button>
    </div>
  )
}
