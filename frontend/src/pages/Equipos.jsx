import { useState } from 'react'
import '../styles/equipo.css'

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
    <div className="equipos-container">
      <h2 className="view-title"></h2>

      <div className="equipos-grid">
        {equipos.map(e => (
          <div key={e.id} className="equipo-card">
            <div className="equipo-header">
              <h3>{e.nombre}</h3>
            </div>

            <div className="equipo-info">
              <p>
                <strong>Presupuesto:</strong><br />
                ₡{e.presupuesto.toLocaleString()}
              </p>

              <p>
                <strong>Carros:</strong> {e.carros} / 2
              </p>

              <p>
                <strong>Conductores:</strong> {e.conductores}
              </p>
            </div>

            <div className="equipo-actions">
              <button className="btn btn-edit">Editar</button>
              <button className="btn btn-delete">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-add"
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
        + Agregar Equipo
      </button>
    </div>
  )
}
