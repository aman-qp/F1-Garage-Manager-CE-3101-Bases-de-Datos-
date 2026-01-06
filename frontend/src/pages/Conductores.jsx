import { useState } from 'react'

export default function Conductores() {
  const [conductores, setConductores] = useState([
    {
      id: 1,
      nombre: 'Carlos Pérez',
      habilidad: 85,
      equipo: 'Equipo Rojo'
    },
    {
      id: 2,
      nombre: 'Ana Gómez',
      habilidad: 78,
      equipo: 'Equipo Azul'
    }
  ])

  return (
    <div>
      <h2>Gestión de Conductores</h2>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Habilidad (H)</th>
            <th>Equipo</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {conductores.map(conductor => (
            <tr key={conductor.id}>
              <td>{conductor.id}</td>
              <td>{conductor.nombre}</td>
              <td>{conductor.habilidad}</td>
              <td>{conductor.equipo}</td>
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
          setConductores([
            ...conductores,
            {
              id: conductores.length + 1,
              nombre: 'Nuevo Conductor',
              habilidad: 70,
              equipo: 'Equipo Rojo'
            }
          ])
        }
      >
        Agregar Conductor
      </button>
    </div>
  )
}
