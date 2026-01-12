import { useState } from 'react'
import '../styles/armado.css'

export default function Armado() {
  const categorias = ['Caja_de_Cambios', 'Paquete_aerodinámico', 'Neumáticos', 'Suspensión','Unidad_de_Potencia']

  const [partesInstaladas, setPartesInstaladas] = useState({
    Caja_de_Cambios: null,
    Paquete_aerodinámico: null,
    Neumáticos: null,
    Suspensión: null,
    Unidad_de_Potencia: null
  })

  const partesDisponibles = {
    Caja_de_Cambios: { nombre: 'Caja de Cambios V8', P: 8, A: 6, M: 4 },
    Paquete_aerodinámico: { nombre: 'Alerón Pro', P: 4, A: 8, M: 3 },
    Neumáticos: { nombre: 'Neumáticos Soft', P: 3, A: 4, M: 9 },
    Suspensión: { nombre: 'Suspensión Avanzada', P: 5, A: 5, M: 7 },
    Unidad_de_Potencia: { nombre: 'Unidad de Potencia X', P: 9, A: 3, M: 5 }
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
              Instalar: {partesDisponibles[cat].nombre}
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

