import { useEffect, useState } from 'react'
import '../styles/simulacion.css'

export default function Simulacion() {
  const [circuitos, setCircuitos] = useState([])
  const [resultados, setResultados] = useState([])
  const [idCircuito, setIdCircuito] = useState('')
  const [dcGlobal, setDcGlobal] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargarCircuitos()
  }, [])

  async function cargarCircuitos() {
    try {
      const res = await fetch('http://localhost:3001/api/circuitos', {
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok) setCircuitos(data)
    } catch{
      alert('Error cargando circuitos')
    }
  }

  async function simularCarrera() {
    if (!idCircuito) {
      alert('Seleccione un circuito')
      return
    }

    setLoading(true)
    setResultados([])

    try {
      const res = await fetch('http://localhost:3001/api/simulacion', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_circuito: Number(idCircuito),
          dc_global: Number(dcGlobal)
        })
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Error en simulación')
        return
      }

      setResultados(data.resultados)
    } catch{
      alert('No se pudo conectar al servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="simulacion-container">
      <h2>Simulación de Carrera</h2>

      <div className="simulacion-form">
        <label>
          Circuito
          <select value={idCircuito} onChange={e => setIdCircuito(e.target.value)}>
            <option value="">Seleccione circuito</option>
            {circuitos.map(c => (
              <option key={c.id_circuito} value={c.id_circuito}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label>
          DC Global
          <input
            type="number"
            value={dcGlobal}
            min="0"
            step="0.1"
            onChange={e => setDcGlobal(e.target.value)}
          />
        </label>

        <button className="btn btn-add" onClick={simularCarrera} disabled={loading}>
          {loading ? 'Simulando...' : 'Simular Carrera'}
        </button>
      </div>

      {resultados.length > 0 && (
        <table className="simulacion-table">
          <thead>
            <tr>
              <th>Posición</th>
              <th>Carro</th>
              <th>Conductor</th>
              <th>Tiempo Total</th>
              <th>Penalización</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map(r => (
              <tr key={r.id_carro}>
                <td>{r.posicion}</td>
                <td>{r.id_carro}</td>
                <td>{r.nombre_conductor}</td>
                <td>{r.tiempo_total}</td>
                <td>{r.penalizacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
