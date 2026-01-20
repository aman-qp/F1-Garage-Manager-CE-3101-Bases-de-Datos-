import { useState, useEffect } from 'react';
import '../styles/conductores.css';
import { useAuth } from '../context/AuthContext';

export default function Conductores() {
  const [conductores, setConductores] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [driversDisponibles, setDriversDisponibles] = useState([]);
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'Admin';

  
  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  
  // Formularios
  const [formCrear, setFormCrear] = useState({
    id_usuario: '',
    id_equipo: '',
    habilidad_h: 70
  });
  
  const [formEditar, setFormEditar] = useState({
    id_conductor: null,
    id_equipo: '',
    habilidad_h: 70
  });

  useEffect(() => {
    cargarConductores();
    cargarEquipos();
  }, []);

  async function cargarConductores() {
    try {
      const res = await fetch('http://localhost:3001/api/conductores', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setConductores(data);
      }
    } catch (err) {
      console.error('Error al cargar conductores:', err);
    }
  }

  async function cargarEquipos() {
    try {
      const res = await fetch('http://localhost:3001/api/equipos', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setEquipos(data);
      }
    } catch (err) {
      console.error('Error al cargar equipos:', err);
    }
  }

  async function cargarDriversDisponibles() {
    try {
      const res = await fetch('http://localhost:3001/api/conductores/disponibles', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDriversDisponibles(data);
      }
    } catch (err) {
      console.error('Error al cargar drivers disponibles:', err);
    }
  }

  async function abrirModalCrear() {
    await cargarDriversDisponibles();
    setModalCrear(true);
  }

  async function crearConductor(e) {
    e.preventDefault();

    if (!formCrear.id_usuario || !formCrear.id_equipo) {
      alert('Todos los campos son requeridos');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/conductores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_usuario: Number(formCrear.id_usuario),
          id_equipo: Number(formCrear.id_equipo),
          habilidad_h: Number(formCrear.habilidad_h)
        })
      });

      if (res.ok) {
        setFormCrear({ id_usuario: '', id_equipo: '', habilidad_h: 70 });
        setModalCrear(false);
        await cargarConductores();
        alert('Conductor creado exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al crear conductor');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  function abrirModalEditar(conductor) {
    setFormEditar({
      id_conductor: conductor.id_conductor,
      id_equipo: conductor.id_equipo,
      habilidad_h: conductor.habilidad_h
    });
    setModalEditar(true);
  }

  async function actualizarConductor(e) {
    e.preventDefault();

    try {
      const res = await fetch(
        `http://localhost:3001/api/conductores/${formEditar.id_conductor}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id_equipo: Number(formEditar.id_equipo),
            habilidad_h: Number(formEditar.habilidad_h)
          })
        }
      );

      if (res.ok) {
        setModalEditar(false);
        await cargarConductores();
        alert('Conductor actualizado exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al actualizar conductor');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  async function eliminarConductor(id) {
    if (!confirm('¿Está seguro de eliminar este conductor?')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/api/conductores/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        await cargarConductores();
        alert('Conductor eliminado exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar conductor');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  return (
    <div className="conductores-container">
      <div className="conductores-grid">
        {conductores.map(c => (
          <div key={c.id_conductor} className="conductor-card">
            <div className="conductor-header">
              <h3>{c.nombre_completo}</h3>
              <span className="conductor-equipo">Equipo: {c.nombre_equipo}</span>
            </div>

            <div className="conductor-info">
              <p className={c.disponible ? 'disponible' : 'no-disponible'}>
                {c.disponible ? 'Disponible' : 'Asignado a carro'}
              </p>
            </div>

            <div className="conductor-skill">
              <span>Habilidad</span>
              <div className="skill-bar">
                <div
                  className="skill-fill"
                  style={{ width: `${c.habilidad_h}%` }}
                />
              </div>
              <strong>{c.habilidad_h}</strong>
            </div>

            {esAdmin && (
              <div className="conductor-actions">
                <button className="btn btn-edit" onClick={() => abrirModalEditar(c)}>
                  Editar
                </button>
                <button className="btn btn-delete" onClick={() => eliminarConductor(c.id_conductor)}>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {esAdmin && (
        <button className="btn btn-add" onClick={abrirModalCrear}>
          + Agregar Conductor
        </button>
      )}


      {/* Modal Crear Conductor */}
      {modalCrear && (
        <div className="modal-overlay" onClick={() => setModalCrear(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Crear Conductor</h3>
            
            {driversDisponibles.length === 0 ? (
              <p className="warning">
                No hay usuarios Driver disponibles. Primero crea un usuario con rol Driver.
              </p>
            ) : (
              <div className="form-conductor">
                <div className="form-group">
                  <label>Usuario Driver</label>
                  <select
                    value={formCrear.id_usuario}
                    onChange={e => setFormCrear({ ...formCrear, id_usuario: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Seleccionar...</option>
                    {driversDisponibles.map(d => (
                      <option key={d.id_usuario} value={d.id_usuario}>
                        {d.nombre_completo} ({d.nombre_usuario})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Equipo</label>
                  <select
                    value={formCrear.id_equipo}
                    onChange={e => setFormCrear({ ...formCrear, id_equipo: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Seleccionar...</option>
                    {equipos.map(e => (
                      <option key={e.id_equipo} value={e.id_equipo}>
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Habilidad (0-100): {formCrear.habilidad_h}</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formCrear.habilidad_h}
                    onChange={e => setFormCrear({ ...formCrear, habilidad_h: e.target.value })}
                    className="slider"
                  />
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setModalCrear(false)} className="btn btn-secondary">
                Cancelar
              </button>
              {driversDisponibles.length > 0 && (
                <button onClick={crearConductor} className="btn btn-add">
                  Crear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Conductor */}
      {modalEditar && (
        <div className="modal-overlay" onClick={() => setModalEditar(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Editar Conductor</h3>
            
            <div className="form-conductor">
              <div className="form-group">
                <label>Equipo</label>
                <select
                  value={formEditar.id_equipo}
                  onChange={e => setFormEditar({ ...formEditar, id_equipo: e.target.value })}
                  className="input-field"
                >
                  {equipos.map(e => (
                    <option key={e.id_equipo} value={e.id_equipo}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Habilidad (0-100): {formEditar.habilidad_h}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formEditar.habilidad_h}
                  onChange={e => setFormEditar({ ...formEditar, habilidad_h: e.target.value })}
                  className="slider"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setModalEditar(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={actualizarConductor} className="btn btn-edit">
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}