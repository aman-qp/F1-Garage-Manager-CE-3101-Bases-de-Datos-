import { useState } from 'react'

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
    <div>
      <h2>Armado de Carro</h2>

      {categorias.map(cat => (
        <div key={cat}>
          <strong>{cat}:</strong>{' '}
          <button
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

      <hr />

      <h3>Resumen de Rendimiento</h3>
      <p>P: {resumen.P}</p>
      <p>A: {resumen.A}</p>
      <p>M: {resumen.M}</p>
    </div>
  )
}

