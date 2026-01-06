import { useState } from 'react'

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
    <div>
      <h2>Gestión de Patrocinadores</h2>

      <table border="1" cellPadding="8">
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
                <button>Editar</button>{' '}
                <button>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      <button onClick={agregarPatrocinador}>
        Agregar Patrocinador
      </button>
    </div>
  )
}
