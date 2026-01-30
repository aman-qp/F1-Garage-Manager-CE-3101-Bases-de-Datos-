import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import '../styles/armado.css';
import { useAuth } from '../context/AuthContext';

const CATEGORIAS = [
  { id: 1, nombre: 'Unidad de potencia' },
  { id: 2, nombre: 'Paquete aerodinámico' },
  { id: 3, nombre: 'Neumáticos' },
  { id: 4, nombre: 'Suspensión' },
  { id: 5, nombre: 'Caja de cambios' }
];

export default function Armado() {
  const [equipos, setEquipos] = useState([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [carros, setCarros] = useState([]);
  const [carroSeleccionado, setCarroSeleccionado] = useState(null);
  const [setup, setSetup] = useState(null);
  const [conductores, setConductores] = useState([]);
  const { usuario } = useAuth();

  // Modales
  const [modalCrearCarro, setModalCrearCarro] = useState(false);
  const [modalSeleccionarParte, setModalSeleccionarParte] = useState(false);
  const [modalAsignarConductor, setModalAsignarConductor] = useState(false);

  // Estado para selección de parte
  const [categoriaActual, setCategoriaActual] = useState(null);
  const [partesDisponibles, setPartesDisponibles] = useState([]);

  useEffect(() => {
    cargarEquipos();
  }, []);

  useEffect(() => {
    if (equipoSeleccionado) {
      cargarCarros();
      cargarConductores();
    }
  }, [equipoSeleccionado]);

  useEffect(() => {
    if (carroSeleccionado) {
      cargarSetup();
    } else {
      setSetup(null);
    }
  }, [carroSeleccionado]);

  async function cargarEquipos() {
    try {
      const res = await fetch(`${API_URL}/api/equipos`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();

        // Engineer: solo su equipo
        if (usuario?.rol === 'Engineer' && usuario?.id_equipo) {
          const miEquipo = data.filter(e => e.id_equipo === usuario.id_equipo);
          setEquipos(miEquipo);
          setEquipoSeleccionado(usuario.id_equipo);
          setCarroSeleccionado(null);
          return;
        }

        // Admin: todos
        setEquipos(data);
        if (data.length > 0) {
          setEquipoSeleccionado(data[0].id_equipo);
        } else {
          setCarroSeleccionado(null);
          setSetup(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar equipos:', err);
    }
  }

  async function cargarCarros() {
    try {
      const res = await fetch(
        `${API_URL}/api/carros/equipo/${equipoSeleccionado}`,
        { credentials: 'include' }
      );

      if (res.ok) {
        const data = await res.json();
        setCarros(data);

        if (data.length > 0 && !carroSeleccionado) {
          setCarroSeleccionado(data[0].id_carro);
        }

        if (data.length === 0) {
          setCarroSeleccionado(null);
          setSetup(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar carros:', err);
    }
  }

  async function cargarSetup() {
    try {
      const res = await fetch(
        `${API_URL}/api/carros/${carroSeleccionado}/setup`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setSetup(data);
      }
    } catch (err) {
      console.error('Error al cargar setup:', err);
    }
  }

  async function cargarConductores() {
    try {
      const res = await fetch(
        `${API_URL}/api/equipos/${equipoSeleccionado}/conductores`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setConductores(data);
      }
    } catch (err) {
      console.error('Error al cargar conductores:', err);
    }
  }

  async function crearCarro() {
    try {
      const res = await fetch(`${API_URL}/api/carros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id_equipo: equipoSeleccionado })
      });

      if (res.ok) {
        const data = await res.json();
        setModalCrearCarro(false);

        await cargarCarros();
        setCarroSeleccionado(data.id_carro);

        alert('Carro creado exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al crear carro');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  async function abrirSeleccionParte(categoria) {
    setCategoriaActual(categoria);

    try {
      const res = await fetch(
        `${API_URL}/api/inventario/${equipoSeleccionado}/categoria/${categoria.id}`,
        { credentials: 'include' }
      );

      if (res.ok) {
        const data = await res.json();
        setPartesDisponibles(data);
        setModalSeleccionarParte(true);
      } else {
        alert('Error al cargar partes disponibles');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  async function instalarParte(id_parte) {
    try {
      const res = await fetch(
        `${API_URL}/api/carros/${carroSeleccionado}/instalar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id_categoria: categoriaActual.id,
            id_parte
          })
        }
      );

      if (res.ok) {
        setModalSeleccionarParte(false);
        await cargarSetup();
        alert('Parte instalada exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al instalar parte');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  async function asignarConductor(id_conductor) {
    try {
      const res = await fetch(
        `${API_URL}/api/carros/${carroSeleccionado}/conductor`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id_conductor })
        }
      );

      if (res.ok) {
        setModalAsignarConductor(false);
        await cargarSetup();
        await cargarConductores();
        alert('Conductor asignado exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al asignar conductor');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  async function finalizarCarro() {
    if (!confirm('¿Está seguro de finalizar este carro? No podrá modificarlo después.')) {
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/carros/${carroSeleccionado}/finalizar`,
        { method: 'POST', credentials: 'include' }
      );

      if (res.ok) {
        await cargarSetup();
        await cargarCarros();
        alert('Carro finalizado exitosamente');
      } else {
        const data = await res.json();
        alert(data.message || 'Error al finalizar carro');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  // Reabrir carro finalizado (volver a Armando)
  async function editarCarro() {
    if (!carroSeleccionado) return;

    const ok = confirm(
      'Esto reabrirá el carro (Finalizado → Armando) para poder cambiar partes.\n\n' +
      '¿Deseas continuar?'
    );
    if (!ok) return;

    try {
      const res = await fetch(
        `${API_URL}/api/carros/${carroSeleccionado}/reabrir`,
        {
          method: 'PUT',             
          credentials: 'include'
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || 'No se pudo reabrir el carro');
        return;
      }

      await cargarCarros();
      await cargarSetup();
      await cargarConductores();
      alert(data.message || 'Carro reabierto. Ahora puedes modificar partes.');
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }


  async function eliminarCarro() {
    if (!carroSeleccionado) return;

    const ok = confirm(
      '¿Está seguro de eliminar este carro?\n\n' +
      '- Las partes instaladas volverán al inventario\n' +
      '- El conductor quedará libre\n' +
      '- Esta acción NO se puede deshacer'
    );

    if (!ok) return;

    try {
      const res = await fetch(
        `${API_URL}/api/carros/${carroSeleccionado}`,
        { method: 'DELETE', credentials: 'include' }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || 'Error al eliminar carro');
        return;
      }

      const carroBorrado = carroSeleccionado;
      setCarroSeleccionado(null);
      setSetup(null);

      const resCarros = await fetch(
        `${API_URL}/api/carros/equipo/${equipoSeleccionado}`,
        { credentials: 'include' }
      );

      let lista = [];
      if (resCarros.ok) {
        lista = await resCarros.json();
      }

      setCarros(lista);

      if (lista.length > 0) {
        const nuevo = lista[0].id_carro;
        setCarroSeleccionado(nuevo);
      } else {
        setCarroSeleccionado(null);
        setSetup(null);
      }

      await cargarConductores();

      alert(data.message || `Carro #${carroBorrado} eliminado exitosamente`);
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con la API');
    }
  }

  const equipoActual = equipos.find(e => e.id_equipo === equipoSeleccionado);

  const parteInstalada = (id_categoria) => {
    return setup?.partes.find(p => p.id_categoria === id_categoria);
  };

  return (
    <div className="armado-container">
      <h1 className="armado-title">Armado de Carros</h1>

      {/* Selector de Equipo */}
      <div className="selector-equipo">
        <label>Seleccionar Equipo:</label>
        <select
          value={equipoSeleccionado || ''}
          onChange={e => {
            const nuevoEquipo = Number(e.target.value);

            setCarros([]);
            setCarroSeleccionado(null);
            setSetup(null);
            setConductores([]);

            setEquipoSeleccionado(nuevoEquipo);
          }}
          className="select-equipo"
          disabled={usuario?.rol === 'Engineer'}
          style={{
            cursor: usuario?.rol === 'Engineer' ? 'not-allowed' : 'pointer',
            opacity: usuario?.rol === 'Engineer' ? 0.7 : 1
          }}
        >
          {equipos.map(e => (
            <option key={e.id_equipo} value={e.id_equipo}>
              {e.nombre}
            </option>
          ))}
        </select>

        {usuario?.rol === 'Engineer' && (
          <small style={{ color: '#999' }}>
            (Solo puedes armar carros de tu equipo)
          </small>
        )}

        <button onClick={() => setModalCrearCarro(true)} className="btn btn-primary">
          Crear Nuevo Carro
        </button>
      </div>

      {equipoSeleccionado && carros.length === 0 && (
        <div className="empty-carros">
          <div className="empty-icon">🚗</div>
          <p>Este equipo no tiene carros aún</p>
          <p>Crea un carro para comenzar el armado.</p>
        </div>
      )}

      {carros.length > 0 && (
        <div className="selector-carro">
          <label>Seleccionar Carro:</label>
          <select
            value={carroSeleccionado || ''}
            onChange={e => setCarroSeleccionado(Number(e.target.value))}
            className="select-carro"
          >
            {carros.map(c => (
              <option key={c.id_carro} value={c.id_carro}>
                Carro #{c.id_carro} - {c.estado} ({c.categorias_instaladas}/5 partes)
              </option>
            ))}
          </select>
        </div>
      )}

      {setup && (
        <div className="armado-panel">
          <div className="carro-info">
            <h2>Carro #{setup.carro?.id_carro}</h2>
            <p>Estado: <strong>{setup.carro?.estado}</strong></p>
            <p>Conductor: {setup.carro?.nombre_conductor || 'Sin asignar'}</p>
            {setup.carro?.habilidad_h && <p>Habilidad: {setup.carro.habilidad_h}</p>}

            <div className="carro-acciones">
              {setup.carro?.estado === 'Armando' && (
                <>
                  <button onClick={() => setModalAsignarConductor(true)} className="btn btn-secondary">
                    {setup.carro?.nombre_conductor ? 'Cambiar Conductor' : 'Asignar Conductor'}
                  </button>
                  <button onClick={finalizarCarro} className="btn btn-success">
                    Finalizar Carro
                  </button>
                </>
              )}

              {/* si está Finalizado, permitir reabrir para editar */}
              {setup.carro?.estado === 'Finalizado' && (
                <button onClick={editarCarro} className="btn btn-secondary">
                  Editar Carro
                </button>
              )}

              <button onClick={eliminarCarro} className="btn btn-danger">
                Eliminar Carro
              </button>
            </div>
          </div>

          <div className="categorias-grid">
            {CATEGORIAS.map(cat => {
              const parte = parteInstalada(cat.id);

              return (
                <div key={cat.id} className="categoria-slot">
                  <h3>{cat.nombre}</h3>

                  {parte ? (
                    <div className="parte-instalada">
                      <p className="parte-nombre">{parte.nombre_parte}</p>
                      <div className="parte-stats">
                        <span>P: {parte.potencia}</span>
                        <span>A: {parte.aerodinamica}</span>
                        <span>M: {parte.manejo}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="sin-parte">Sin instalar</p>
                  )}

                  {setup.carro?.estado === 'Armando' && (
                    <button
                      onClick={() => abrirSeleccionParte(cat)}
                      className="btn btn-small"
                    >
                      {parte ? 'Reemplazar' : 'Instalar'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="resumen-rendimiento">
            <h3>Resumen de Rendimiento</h3>
            <div className="stats-totales">
              <div className="stat-item">
                <span className="stat-label">Potencia Total (P)</span>
                <span className="stat-valor">{setup.totales?.total_potencia || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Aerodinámica Total (A)</span>
                <span className="stat-valor">{setup.totales?.total_aerodinamica || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Manejo Total (M)</span>
                <span className="stat-valor">{setup.totales?.total_manejo || 0}</span>
              </div>
              {setup.carro?.habilidad_h && (
                <div className="stat-item">
                  <span className="stat-label">Habilidad Conductor (H)</span>
                  <span className="stat-valor">{setup.carro.habilidad_h}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Carro */}
      {modalCrearCarro && (
        <div className="modal-overlay" onClick={() => setModalCrearCarro(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Crear Nuevo Carro</h3>
            <p>¿Desea crear un nuevo carro para {equipoActual?.nombre}?</p>
            <p className="warning">El equipo puede tener máximo 2 carros.</p>
            <div className="modal-actions">
              <button onClick={() => setModalCrearCarro(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={crearCarro} className="btn btn-primary">
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Seleccionar Parte */}
      {modalSeleccionarParte && (
        <div className="modal-overlay" onClick={() => setModalSeleccionarParte(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <h3>Seleccionar {categoriaActual?.nombre}</h3>

            {partesDisponibles.length === 0 ? (
              <p className="empty-message">No hay partes disponibles en el inventario</p>
            ) : (
              <div className="partes-grid">
                {partesDisponibles.map(parte => (
                  <div key={parte.id_parte} className="parte-card">
                    <h4>{parte.nombre}</h4>
                    <div className="parte-stats">
                      <span>P: {parte.potencia}</span>
                      <span>A: {parte.aerodinamica}</span>
                      <span>M: {parte.manejo}</span>
                    </div>
                    <p>Disponibles: {parte.cantidad}</p>
                    <button
                      onClick={() => instalarParte(parte.id_parte)}
                      className="btn btn-primary"
                    >
                      Instalar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setModalSeleccionarParte(false)} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Conductor */}
      {modalAsignarConductor && (
        <div className="modal-overlay" onClick={() => setModalAsignarConductor(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Asignar Conductor</h3>

            {conductores.filter(c => c.disponible || c.id_conductor === setup?.carro?.id_conductor).length === 0 ? (
              <p className="empty-message">No hay conductores disponibles</p>
            ) : (
              <div className="conductores-list">
                {conductores
                  .filter(c => c.disponible || c.id_conductor === setup?.carro?.id_conductor)
                  .map(conductor => (
                    <div key={conductor.id_conductor} className="conductor-item">
                      <div>
                        <strong>{conductor.nombre_completo}</strong>
                        <p>Habilidad: {conductor.habilidad_h}</p>
                      </div>
                      <button
                        onClick={() => asignarConductor(conductor.id_conductor)}
                        className="btn btn-small"
                      >
                        Asignar
                      </button>
                    </div>
                  ))}
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setModalAsignarConductor(false)} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
