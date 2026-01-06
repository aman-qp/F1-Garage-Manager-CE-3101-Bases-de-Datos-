import { useState } from 'react'

export default function Equipos() {
  const [equipos, setEquipos] = useState([
    {
      id: 1,
      nombre: 'Equipo Rojo',
      presupuesto: 1200000,
      carros: 2,
      conductores: 2
    },
    {
      id: 2,
      nombre: 'Equipo Azul',
      presupuesto: 850000,
      carros: 1,
      conductores: 1
    }
  ])

  return (
    <div>
      <h2>Gestión de Equipos</h2>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Presupuesto</th>
            <th>Carros</th>
            <th>Conductores</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {equipos.map(e => (
            <tr key={e.id}>
              <td>{e.id}</td>
              <td>{e.nombre}</td>
              <td>₡{e.presupuesto.toLocaleString()}</td>
              <td>{e.carros} / 2</td>
              <td>{e.conductores}</td>
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
          setEquipos([
            ...equipos,
            {
              id: equipos.length + 1,
              nombre: 'Nuevo Equipo',
              presupuesto: 0,
              carros: 0,
              conductores: 0
            }
          ])
        }
      >
        Agregar Equipo
      </button>
    </div>
  )
}
