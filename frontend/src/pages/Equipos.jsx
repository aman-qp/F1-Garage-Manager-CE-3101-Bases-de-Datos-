import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/equipo.css';

export default function Equipos() {
  const { usuario } = useAuth();

  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal crear/editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [form, setForm] = useState({
    id_equipo: null,
    nombre: ''
  });

  useEffect(() => {
    cargarEquipos();
  }, []);

  async function cargarEquipos() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/equipos', {
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'No se pudieron cargar los equipos');
      }

      const data = await res.json();
      setEquipos(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  }

  function abrirCrear() {
    setModoEdicion(false);
    setForm({ id_equipo: null, nombre: '' });
    setModalAbierto(true);
  }

  function abrirEditar(equipo) {
    setModoEdicion(true);
    setForm({ id_equipo: equipo.id_equipo, nombre: equipo.nombre });
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setModoEdicion(false);
    setForm({ id_equipo: null, nombre: '' });
  }

  async function guardarEquipo(e) {
    e.preventDefault();

    const nombre = (form.nombre || '').trim();
    if (!nombre) {
      alert('El nombre del equipo es requerido');
      return;
    }

    try {
      const url = modoEdicion
        ? `http://localhost:3001/api/equipos/${form.id_equipo}`
        : 'http://localhost:3001/api/equipos';

      const method = modoEdicion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Error al guardar equipo');
        return;
      }

      cerrarModal();
      await cargarEquipos();
      alert(modoEdicion ? 'Equipo actualizado' : 'Equipo creado');
    } catch (err) {
      console.error(err);
      alert('No se pudo conectar con la API');
    }
  }

  async function eliminarEquipo(id_equipo, nombre) {
    if (!confirm(`¿Seguro que deseas eliminar el equipo "${nombre}"?`)) return;

    try {
      const res = await fetch(`http://localhost:3001/api/equipos/${id_equipo}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Error al eliminar equipo');
        return;
      }

      await cargarEquipos();
      alert('Equipo eliminado');
    } catch (err) {
      console.error(err);
      alert('No se pudo conectar con la API');
    }
  }

  // Seguridad extra (por si alguien entra “a la fuerza”)
  if (usuario?.rol !== 'Admin') {
    return (
      <div className="equipos-container">
        <h2 className="view-title">Equipos</h2>
        <div className="equipos-empty">
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}></p>
          <p>No tienes permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="equipos-container">
      <h2 className="view-title">Equipos</h2>

      {loading ? (
        <div className="equipos-empty">
          <p>Cargando equipos...</p>
        </div>
      ) : error ? (
        <div className="equipos-empty">
          <p style={{ color: '#fbbf24', fontWeight: 700 }}>{error}</p>
          <button className="btn btn-secondary" onClick={cargarEquipos}>
            Reintentar
          </button>
        </div>
      ) : equipos.length === 0 ? (
        <div className="equipos-empty">
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</p>
          <p>No hay equipos creados todavía.</p>
          <p style={{ color: '#666' }}>Crea el primero con el botón de abajo.</p>
        </div>
      ) : (
        <div className="equipos-grid">
          {equipos.map(e => (
            <div key={e.id_equipo} className="equipo-card">
              <div className="equipo-header">
                <h3>{e.nombre}</h3>
                <span className="equipo-id">ID #{e.id_equipo}</span>
              </div>

              <div className="equipo-info">
                <div className="equipo-pill">
                   Carros: <strong>{e.total_carros}</strong> / 2
                </div>
                <div className="equipo-pill">
                   Engineers: <strong>{e.total_ingenieros}</strong>
                </div>
                <div className="equipo-pill">
                   Conductores: <strong>{e.total_conductores}</strong>
                </div>
              </div>

              <div className="equipo-actions">
                <button className="btn btn-edit" onClick={() => abrirEditar(e)}>
                  Editar
                </button>
                <button
                  className="btn btn-delete"
                  onClick={() => eliminarEquipo(e.id_equipo, e.nombre)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-add" onClick={abrirCrear}>
        + Agregar Equipo
      </button>

      {/* Modal Crear / Editar */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal" onClick={ev => ev.stopPropagation()}>
            <h3>{modoEdicion ? 'Editar Equipo' : 'Crear Equipo'}</h3>

            <form onSubmit={guardarEquipo} className="equipo-form">
              <label>Nombre del equipo</label>
              <input
                className="input-field"
                value={form.nombre}
                onChange={ev => setForm({ ...form, nombre: ev.target.value })}
                placeholder="Ej: Scuderia Ferrari"
                maxLength={100}
              />

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {modoEdicion ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
            <p className="modal-note">
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
