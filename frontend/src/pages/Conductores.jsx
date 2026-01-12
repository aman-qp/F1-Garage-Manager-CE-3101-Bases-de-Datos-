import { useState } from 'react'
import '../styles/conductor.css'
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
    <div className="conductores-container">

      <div className="conductores-grid">
        {conductores.map(c => (
          <div key={c.id} className="conductor-card">
            <div className="conductor-header">
              <h3>{c.nombre}</h3>
              <span className="conductor-equipo">{c.equipo}</span>
            </div>

            <div className="conductor-skill">
              <span>Habilidad</span>
              <div className="skill-bar">
                <div
                  className="skill-fill"
                  style={{ width: `${c.habilidad}%` }}
                />
              </div>
              <strong>{c.habilidad}</strong>
            </div>

            <div className="conductor-actions">
              <button className="btn btn-edit">Editar</button>
              <button className="btn btn-delete">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-add"
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
        + Agregar Conductor
      </button>
    </div>
  )
}
