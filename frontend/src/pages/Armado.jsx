import { useState } from 'react'
import '../styles/armado.css'

export default function Armado() {
  const categorias = ['Motor', 'Aerodinámica', 'Neumáticos']

  const [partesInstaladas, setPartesInstaladas] = useState({
    Motor: null,
    Aerodinámica: null,
    Neumáticos: null
  })

  const partesDisponibles = {
    Motor: { nombre: 'Motor V8', P: 80, A: 60, M: 40 },
    Aerodinámica: { nombre: 'Alerón Pro', P: 40, A: 85, M: 30 },
    Neumáticos: { nombre: 'Neumáticos Soft', P: 30, A: 40, M: 90 }
  }

  const resumen = Object.values(partesInstaladas).reduce(
    (acc, parte) => {
      if (parte) {
        acc.P += parte.P
        acc.A += parte.A
        acc.M += parte.M
      }
      return acc
    },
    { P: 0, A: 0, M: 0 }
  )
  return (
    <div className="usuarios-container">
      <div className="armado-grid">
        {categorias.map(cat => (
          <div key={cat} className="armado-slot">
            <h3>{cat}</h3>

            {partesInstaladas[cat] ? (
              <div className="armado-installed">
                <p className="installed-name">
                  {partesInstaladas[cat].nombre}
                </p>
                <p>P {partesInstaladas[cat].P}</p>
                <p>A {partesInstaladas[cat].A}</p>
                <p>M {partesInstaladas[cat].M}</p>
              </div>
            ) : (
              <p className="armado-empty">Sin instalar</p>
            )}

            <button
              className="btn btn-add"
              onClick={() =>
                setPartesInstaladas({
                  ...partesInstaladas,
                  [cat]: partesDisponibles[cat]
                })
              }
            >
              Instalar {partesDisponibles[cat].nombre}
            </button>
          </div>
        ))}
      </div>

      <div className="armado-resumen">
      <h3>Resumen de Rendimiento</h3>

      <div className="resumen-stats">
        <span>Potencia (P): {resumen.P}</span>
        <span>Aerodinámica (A): {resumen.A}</span>
        <span>Manejo (M): {resumen.M}</span>
      </div>
    </div>
    </div>
  )
}

