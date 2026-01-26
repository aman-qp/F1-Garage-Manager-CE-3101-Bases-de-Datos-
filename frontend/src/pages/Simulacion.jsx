import { useEffect, useState } from 'react'
import '../styles/simulacion.css'

export default function Simulacion() {
  const [circuitos, setCircuitos] = useState([])
  const [resultados, setResultados] = useState([])
  const [idCircuito, setIdCircuito] = useState('')
  const [dcGlobal, setDcGlobal] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dcMaximo, setDcMaximo] = useState(null)

  useEffect(() => {
    cargarCircuitos()
  }, [])

  // Calcular dc_maximo cuando cambia el circuito
  useEffect(() => {
    if (idCircuito) {
      const circuito = circuitos.find(c => c.id_circuito === Number(idCircuito))
      if (circuito) {
        const maxDc = (circuito.distancia_total / circuito.cantidad_curvas).toFixed(2)
        setDcMaximo(maxDc)
        
        // Si el dc_global actual es mayor al máximo, ajustarlo
        if (Number(dcGlobal) > Number(maxDc)) {
          setDcGlobal(maxDc)
        }
      }
    } else {
      setDcMaximo(null)
    }
  }, [idCircuito, circuitos])

  async function cargarCircuitos() {
    try {
      const res = await fetch('http://localhost:3001/api/circuitos', {
        credentials: 'include'
      })
      
      if (!res.ok) {
        console.error('Error cargando circuitos:', res.status)
        return
      }
      
      const data = await res.json()
      console.log('Circuitos cargados:', data)
      setCircuitos(data)
    } catch (err) {
      console.error('Error en cargarCircuitos:', err)
      alert('Error cargando circuitos')
    }
  }

  async function simularCarrera() {
    console.log('Iniciando simulación...')
    setError('')

    if (!idCircuito) {
      setError('Seleccione un circuito')
      return
    }

    if (dcMaximo && Number(dcGlobal) > Number(dcMaximo)) {
      setError(`DC Global no puede ser mayor a ${dcMaximo} km para este circuito`)
      return
    }

    setLoading(true)
    setResultados([])

    try {
      const body = {
        id_circuito: Number(idCircuito),
        dc_global: Number(dcGlobal)
      }
      
      console.log('Enviando:', body)

      // Delay para animación
      const delay = new Promise(resolve => setTimeout(resolve, 3000))

      const fetchData = fetch('http://localhost:3001/api/simulacion', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const [res] = await Promise.all([fetchData, delay])
      
      console.log('Respuesta status:', res.status)
      
      const data = await res.json()
      console.log('Respuesta data:', data)

      if (!res.ok) {
        setError(data.error || data.detalle || 'Error desconocido')
        console.error('Error del servidor:', data)
        return
      }

      if (!data.resultados || data.resultados.length === 0) {
        setError('No se generaron resultados. Verifica que haya carros finalizados.')
        return
      }

      console.log('Resultados:', data.resultados)
      setResultados(data.resultados)

    } catch (err) {
      console.error('Error en simularCarrera:', err)
      setError('No se pudo conectar al servidor: ' + err.message)
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
          <select 
            value={idCircuito} 
            onChange={e => setIdCircuito(e.target.value)}
            disabled={loading}
          >
            <option value="">Seleccione circuito</option>
            {circuitos.map(c => (
              <option key={c.id_circuito} value={c.id_circuito}>
                {c.nombre} ({c.distancia_total} km, {c.cantidad_curvas} curvas)
              </option>
            ))}
          </select>
        </label>

        <label>
          DC Global (distancia por curva en km)
          {dcMaximo && (
            <small style={{ display: 'block', color: '#facc15', marginTop: '0.25rem' }}>
              Máximo permitido: {dcMaximo} km
            </small>
          )}
          <input
            type="number"
            value={dcGlobal}
            min="0.1"
            max={dcMaximo || 10}
            step="0.1"
            onChange={e => setDcGlobal(e.target.value)}
            disabled={loading}
          />
        </label>

        <button 
          className="btn-primary" 
          onClick={simularCarrera} 
          disabled={loading || !idCircuito}
        >
          {loading ? 'Simulando...' : 'Simular Carrera'}
        </button>

        {error && (
          <div className="error-msg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {loading && (
          <div className="race-track">
            <div className="track-lane"><span className="car car1">🏎️</span></div>
            <div className="track-lane"><span className="car car2">🏎️</span></div>
            <div className="track-lane"><span className="car car3">🏎️</span></div>
            <div className="track-lane"><span className="car car4">🏎️</span></div>
          </div>
        )}
      </div>

      {resultados.length > 0 && (
        <div className="tabla-container">
          <h3 style={{ color: '#facc15', marginBottom: '1rem' }}>
            🏆 Resultados de la Carrera
          </h3>
          <table className="simulacion-table">
            <thead>
              <tr>
                <th>Posición</th>
                <th>Carro</th>
                <th>Conductor</th>
                <th>P</th>
                <th>A</th>
                <th>M</th>
                <th>H</th>
                <th>V. Recta</th>
                <th>V. Curva</th>
                <th>Tiempo (s)</th>
                <th>Penalización (s)</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map(r => (
                <tr key={r.id_carro}>
                  <td style={{ 
                    fontWeight: 'bold',
                    fontSize: '1.2rem',
                    color: r.posicion === 1 ? '#ffd700' : 
                           r.posicion === 2 ? '#c0c0c0' : 
                           r.posicion === 3 ? '#cd7f32' : '#facc15'
                  }}>
                    #{r.posicion}
                  </td>
                  <td>Carro {r.id_carro}</td>
                  <td><strong>{r.nombre_conductor}</strong></td>
                  <td>{r.p_usado}</td>
                  <td>{r.a_usado}</td>
                  <td>{r.m_usado}</td>
                  <td>{r.h_conductor}</td>
                  <td>{r.velocidad_recta?.toFixed(2)} km/h</td>
                  <td>{r.velocidad_curva?.toFixed(2)} km/h</td>
                  <td><strong>{r.tiempo_total?.toFixed(3)}</strong></td>
                  <td>{r.penalizacion?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}