import '../styles/presupuesto.css';
import { useState, useEffect } from 'react';

export default function Presupuesto() {
  const [equipos, setEquipos] = useState([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [presupuesto, setPresupuesto] = useState(null);
  const [patrocinadores, setPatrocinadores] = useState([]);
  const [aportes, setAportes] = useState([]);
  
  // Modales
  const [modalPatrocinador, setModalPatrocinador] = useState(false);
  const [modalAporte, setModalAporte] = useState(false);
  
  // Formularios
  const [formPatrocinador, setFormPatrocinador] = useState({ nombre: '' });
  const [formAporte, setFormAporte] = useState({
    id_patrocinador: '',
    monto: '',
    descripcion: ''
  });

  // Cargar equipos al inicio
  useEffect(() => {
    cargarEquipos();
  }, []);

  // Cargar datos cuando se selecciona un equipo
  useEffect(() => {
    if (equipoSeleccionado) {
      cargarPresupuesto();
      cargarPatrocinadores();
      cargarAportes();
    }
  }, [equipoSeleccionado]);

  async function cargarEquipos() {
    try {
      const res = await fetch('http://localhost:3001/api/equipos', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setEquipos(data);
        if (data.length > 0) {
          setEquipoSeleccionado(data[0].id_equipo);
        }
      }
    } catch (err) {
      console.error('Error al cargar equipos:', err);
    }
  }

  async function cargarPresupuesto() {
    try {
      const res = await fetch(
        `http://localhost:3001/api/equipos/${equipoSeleccionado}/presupuesto`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setPresupuesto(data);
      }
    } catch (err) {
      console.error('Error al cargar presupuesto:', err);
    }
  }

  async function cargarPatrocinadores() {
    try {
      const res = await fetch(
        `http://localhost:3001/api/patrocinadores?id_equipo=${equipoSeleccionado}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setPatrocinadores(data);
      }
    } catch (err) {
      console.error('Error al cargar patrocinadores:', err);
    }
  }

  async function cargarAportes() {
    try {
      const res = await fetch(
        `http://localhost:3001/api/aportes/${equipoSeleccionado}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setAportes(data);
      }
    } catch (err) {
      console.error('Error al cargar aportes:', err);
    }
  }

  async function crearPatrocinador(e) {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/patrocinadores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_equipo: equipoSeleccionado,
          nombre: formPatrocinador.nombre
        })
      });

      if (res.ok) {
        setFormPatrocinador({ nombre: '' });
        setModalPatrocinador(false);
        cargarPatrocinadores();
        alert('Patrocinador creado exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al crear patrocinador');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  async function registrarAporte(e) {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/aportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_equipo: equipoSeleccionado,
          id_patrocinador: Number(formAporte.id_patrocinador),
          monto: parseFloat(formAporte.monto),
          descripcion: formAporte.descripcion
        })
      });

      if (res.ok) {
        setFormAporte({ id_patrocinador: '', monto: '', descripcion: '' });
        setModalAporte(false);
        cargarPresupuesto();
        cargarAportes();
        alert('Aporte registrado exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al registrar aporte');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  const equipoActual = equipos.find(e => e.id_equipo === equipoSeleccionado);

  return (
    <div className="presupuesto-container">
      <h1 className="presupuesto-title">Gestión de Presupuesto</h1>

      {/* Selector de Equipo */}
      <div className="selector-equipo">
        <label>Seleccionar Equipo:</label>
        <select
          value={equipoSeleccionado || ''}
          onChange={e => setEquipoSeleccionado(Number(e.target.value))}
          className="select-equipo"
        >
          {equipos.map(e => (
            <option key={e.id_equipo} value={e.id_equipo}>
              {e.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Panel de Presupuesto */}
      {presupuesto && (
        <div className="presupuesto-panel">
          <h2>{equipoActual?.nombre}</h2>
          <div className="presupuesto-stats">
            <div className="stat-card">
              <p className="stat-label">Total Aportes</p>
              <p className="stat-value">${presupuesto.total_aportes?.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Total Gastado</p>
              <p className="stat-value">${presupuesto.total_gastado?.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Disponible</p>
              <p className="stat-value disponible">${presupuesto.presupuesto_disponible?.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="action-buttons">
        <button onClick={() => setModalPatrocinador(true)} className="btn btn-primary">
          + Crear Patrocinador
        </button>
        <button
          onClick={() => setModalAporte(true)}
          disabled={patrocinadores.length === 0}
          className="btn btn-success"
        >
          + Registrar Aporte
        </button>
      </div>

      {/* Grid: Patrocinadores y Aportes */}
      <div className="grid-container">
        {/* Patrocinadores */}
        <div className="card">
          <h3>Patrocinadores</h3>
          {patrocinadores.length === 0 ? (
            <p className="empty-message">No hay patrocinadores registrados</p>
          ) : (
            <ul className="patrocinadores-list">
              {patrocinadores.map(p => (
                <li key={p.id_patrocinador} className="patrocinador-item">
                  {p.nombre_patrocinador}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Historial de Aportes */}
        <div className="card">
          <h3>Historial de Aportes</h3>
          {aportes.length === 0 ? (
            <p className="empty-message">No hay aportes registrados</p>
          ) : (
            <div className="aportes-list">
              {aportes.map(a => (
                <div key={a.id_aporte} className="aporte-item">
                  <div className="aporte-header">
                    <strong>{a.nombre_patrocinador}</strong>
                    <span className="aporte-monto">${a.monto?.toLocaleString()}</span>
                  </div>
                  <div className="aporte-details">
                    <p>Fecha: {new Date(a.fecha).toLocaleDateString()}</p>
                    {a.descripcion && <p>{a.descripcion}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear Patrocinador */}
      {modalPatrocinador && (
        <div className="modal-overlay" onClick={() => setModalPatrocinador(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Crear Patrocinador</h3>
            <div className="form-group">
              <label>Nombre del Patrocinador</label>
              <input
                type="text"
                value={formPatrocinador.nombre}
                onChange={e => setFormPatrocinador({ nombre: e.target.value })}
                className="input-field"
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setModalPatrocinador(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={crearPatrocinador} className="btn btn-primary">
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Aporte */}
      {modalAporte && (
        <div className="modal-overlay" onClick={() => setModalAporte(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Registrar Aporte</h3>
            <div className="form-group">
              <label>Patrocinador</label>
              <select
                value={formAporte.id_patrocinador}
                onChange={e => setFormAporte({ ...formAporte, id_patrocinador: e.target.value })}
                className="input-field"
              >
                <option value="">Seleccionar...</option>
                {patrocinadores.map(p => (
                  <option key={p.id_patrocinador} value={p.id_patrocinador}>
                    {p.nombre_patrocinador}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formAporte.monto}
                onChange={e => setFormAporte({ ...formAporte, monto: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Descripción (opcional)</label>
              <textarea
                value={formAporte.descripcion}
                onChange={e => setFormAporte({ ...formAporte, descripcion: e.target.value })}
                rows={3}
                className="input-field"
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setModalAporte(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={registrarAporte} className="btn btn-success">
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}