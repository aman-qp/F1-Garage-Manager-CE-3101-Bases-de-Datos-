import { useEffect, useMemo, useState } from 'react'
import { API_URL } from '../config'
import '../styles/simulacion.css'

export default function Simulacion() {
  const [circuitos, setCircuitos] = useState([])
  const [carrosDisponibles, setCarrosDisponibles] = useState([])

  const [resultados, setResultados] = useState([])
  const [idCircuito, setIdCircuito] = useState('')
  const [dcGlobal, setDcGlobal] = useState(0.5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dcMaximo, setDcMaximo] = useState(null)

  const [carrosSeleccionados, setCarrosSeleccionados] = useState([])
  const [filtroCarros, setFiltroCarros] = useState('')

  useEffect(() => {
    cargarCircuitos()
    cargarCarrosDisponibles()
  }, [])

  // Calcular dc_maximo cuando cambia el circuito
  useEffect(() => {
    if (idCircuito) {
      const circuito = circuitos.find(c => c.id_circuito === Number(idCircuito))
      if (circuito) {
        if (Number(circuito.cantidad_curvas) > 0) {
          const maxDc = (circuito.distancia_total / circuito.cantidad_curvas).toFixed(2)
          setDcMaximo(maxDc)
          if (Number(dcGlobal) > Number(maxDc)) setDcGlobal(maxDc)
        } else {
          setDcMaximo(null)
        }
      }
    } else {
      setDcMaximo(null)
    }
  }, [idCircuito, circuitos]) // intencional: sin dcGlobal para evitar loops

  async function cargarCircuitos() {
    try {
      const res = await fetch(`${API_URL}/api/circuitos`, {
        credentials: 'include'
      })
      if (!res.ok) return
      const data = await res.json()
      setCircuitos(data)
    } catch {
      alert('Error cargando circuitos')
    }
  }

  async function cargarCarrosDisponibles() {
    try {
      const res = await fetch(`${API_URL}/api/carros/finalizados`, {
        credentials: 'include'
      })

      const data = await res.json().catch(() => ([]))

      if (!res.ok) {
        console.error('Error carros finalizados:', data)
        return
      }

      setCarrosDisponibles(data)

      // opcional: seleccionar todos por defecto
      // setCarrosSeleccionados(data.map(c => c.id_carro))
    } catch (err) {
      console.error('Error cargando carros:', err)
    }
  }

  const carrosFiltrados = useMemo(() => {
    const f = filtroCarros.trim().toLowerCase()
    if (!f) return carrosDisponibles

    return carrosDisponibles.filter(c => {
      const texto = `carro ${c.id_carro} ${c.equipo ?? ''} ${c.conductor ?? ''}`.toLowerCase()
      return texto.includes(f)
    })
  }, [carrosDisponibles, filtroCarros])

  const seleccionadosSet = useMemo(() => new Set(carrosSeleccionados), [carrosSeleccionados])

  function toggleCarro(id) {
    setCarrosSeleccionados(prev => {
      const set = new Set(prev)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return Array.from(set)
    })
  }

  function seleccionarTodosFiltrados() {
    setCarrosSeleccionados(prev => {
      const set = new Set(prev)
      carrosFiltrados.forEach(c => set.add(c.id_carro))
      return Array.from(set)
    })
  }

  function limpiarSeleccion() {
    setCarrosSeleccionados([])
  }

  async function simularCarrera() {
    setError('')
    setResultados([])

    if (!idCircuito) {
      setError('Seleccione un circuito')
      return
    }

    if (!carrosSeleccionados || carrosSeleccionados.length === 0) {
      setError('Seleccione al menos un carro para simular')
      return
    }

    if (dcMaximo && Number(dcGlobal) > Number(dcMaximo)) {
      setError(`DC Global no puede ser mayor a ${dcMaximo} km para este circuito`)
      return
    }

    setLoading(true)

    try {
      const body = {
        id_circuito: Number(idCircuito),
        dc_global: Number(dcGlobal),
        carros: carrosSeleccionados.map(Number)
      }

      const delay = new Promise(resolve => setTimeout(resolve, 3000))

      const fetchData = fetch(`${API_URL}/api/simulacion`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const [res] = await Promise.all([fetchData, delay])
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || data.detalle || 'Error desconocido')
        return
      }

      if (!data.resultados || data.resultados.length === 0) {
        setError('No se generaron resultados con esos carros. Verifica que estén finalizados.')
        return
      }

      setResultados(data.resultados)
    } catch (err) {
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
          Carros a simular
          <div className="carros-picker">
            <div className="carros-picker-top">
              <input
                type="text"
                placeholder="Buscar por #, equipo o conductor…"
                value={filtroCarros}
                onChange={e => setFiltroCarros(e.target.value)}
                disabled={loading}
                className="carros-search"
              />

              <div className="carros-actions">
                <button
                  type="button"
                  className="btn-pill btn-select-all"
                  onClick={seleccionarTodosFiltrados}
                  disabled={loading || carrosFiltrados.length === 0}
                >
                  Seleccionar todos
                </button>

                <button
                  type="button"
                  className="btn-pill btn-clear"
                  onClick={limpiarSeleccion}
                  disabled={loading || carrosSeleccionados.length === 0}
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="carros-counter">
              Seleccionados: <strong>{carrosSeleccionados.length}</strong>
              {carrosFiltrados.length !== carrosDisponibles.length && (
                <span style={{ opacity: 0.8 }}>
                  {' '}• Mostrando {carrosFiltrados.length} de {carrosDisponibles.length}
                </span>
              )}
            </div>

            <div className="carros-list">
              {carrosFiltrados.length === 0 ? (
                <div className="empty-message" style={{ padding: '1rem' }}>
                  No hay carros que coincidan con el filtro.
                </div>
              ) : (
                carrosFiltrados.map(c => {
                  const checked = seleccionadosSet.has(c.id_carro)
                  const label = `Carro #${c.id_carro} - ${c.equipo}${c.conductor ? ` (${c.conductor})` : ''}`

                  return (
                    <label key={c.id_carro} className={`carro-item ${checked ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCarro(c.id_carro)}
                        disabled={loading}
                      />
                      <span>{label}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>
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
            Resultados de la Carrera
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
