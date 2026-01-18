import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import '../styles/conductor.css'

export default function Conductores() {
  const { usuario } = useAuth()

  // 🔹 Dummy solo para Admin / Engineer
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

  // 🔹 Perfil del Driver
  const [miPerfil, setMiPerfil] = useState(null)

  // 🔹 Si soy Driver, cargo mi perfil
  useEffect(() => {
    if (usuario?.rol === 'Driver') {
      fetch('http://localhost:3001/api/conductor/me', {
        credentials: 'include'
      })
        .then(res => res.json())
        .then(setMiPerfil)
        .catch(console.error)
    }
  }, [usuario])

  // ==================================================
  // 👤 VISTA DRIVER (SOLO SU PERFIL)
  // ==================================================
  if (usuario?.rol === 'Driver') {
    if (!miPerfil) {
      return <p style={{ color: 'white' }}>Cargando perfil...</p>
    }

    return (
      <div className="conductores-container">
        <div className="conductor-card single">
          <div className="conductor-header">
            <h3>{miPerfil.nombre}</h3>
            <span className="conductor-equipo">
              Equipo ID: {miPerfil.id_equipo ?? 'Sin equipo'}
            </span>
          </div>

          <div className="conductor-skill">
            <span>Habilidad</span>
            <div className="skill-bar">
              <div
                className="skill-fill"
                style={{ width: `${miPerfil.habilidad}%` }}
              />
            </div>
            <strong>{miPerfil.habilidad}</strong>
          </div>

          <div className="conductor-history">
            <h4>Historial de carreras</h4>
            <p>(Próximamente)</p>
          </div>
        </div>
      </div>
    )
  }

  // ==================================================
  // 👑 ADMIN / ENGINEER (DUMMY COMPLETO)
  // ==================================================
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
          setConductores(prev => [
            ...prev,
            {
              id: prev.length + 1,
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
