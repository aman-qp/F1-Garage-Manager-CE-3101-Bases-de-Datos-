import '../styles/tienda.css';
import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function Tienda() {
  const { usuario } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [presupuesto, setPresupuesto] = useState(null);
  const [partes, setPartes] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [modalCompra, setModalCompra] = useState(false);
  const [parteSeleccionada, setParteSeleccionada] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [cargando, setCargando] = useState(false);

  const categorias = [
    'todas',
    'Unidad de potencia',
    'Paquete aerodinámico',
    'Neumáticos',
    'Suspensión',
    'Caja de cambios'
  ];

  // Cargar equipos al inicio
  useEffect(() => {
    cargarEquipos();
    cargarPartes();
  }, []);

  // Cargar datos cuando se selecciona un equipo
  useEffect(() => {
    if (equipoSeleccionado) {
      cargarPresupuesto();
    }
  }, [equipoSeleccionado]);

  async function cargarEquipos() {
    try {
      const res = await fetch(`${API_URL}/api/equipos`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();

        // Si es Engineer, solo cargar su equipo
        if (usuario?.rol === 'Engineer' && usuario?.id_equipo) {
          const miEquipo = data.filter(e => e.id_equipo === usuario.id_equipo);
          setEquipos(miEquipo);
          setEquipoSeleccionado(usuario.id_equipo);
        } else {
          // Admin ve todos los equipos
          setEquipos(data);
          if (data.length > 0) {
            setEquipoSeleccionado(data[0].id_equipo);
          }
        }
      }
    } catch (err) {
      console.error('Error al cargar equipos:', err);
    }
  }

  async function cargarPresupuesto() {
    try {
      const res = await fetch(
        `${API_URL}/api/equipos/${equipoSeleccionado}/presupuesto`,
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

  async function cargarPartes() {
    try {
      const res = await fetch(`${API_URL}/api/partes`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setPartes(data);
      }
    } catch (err) {
      console.error('Error al cargar partes:', err);
    }
  }

  async function realizarCompra(e) {
    e.preventDefault();

    if (!parteSeleccionada || cantidad < 1) {
      alert('Por favor verifica la cantidad');
      return;
    }

    const costoTotal = parteSeleccionada.precio * cantidad;

    // Validar presupuesto disponible
    if (presupuesto && costoTotal > presupuesto.presupuesto_disponible) {
      alert(
        `Presupuesto insuficiente. Disponible: $${presupuesto.presupuesto_disponible.toLocaleString()}, Necesario: $${costoTotal.toLocaleString()}`
      );
      return;
    }

    // Validar stock disponible (frontend)
    if (cantidad > parteSeleccionada.stock) {
      alert(`Stock insuficiente. Disponible: ${parteSeleccionada.stock} unidades`);
      return;
    }

    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/compras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_equipo: equipoSeleccionado,
          id_parte: parteSeleccionada.id_parte,
          cantidad: cantidad
        })
      });

      let data = null;
      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { message: text };
      }

      if (res.ok) {
        alert(
          `Compra exitosa!\n\n${cantidad} x ${parteSeleccionada.nombre}\nTotal: $${costoTotal.toLocaleString()}`
        );
        setModalCompra(false);
        setParteSeleccionada(null);
        setCantidad(1);

        // Recargar datos actualizados
        await Promise.all([cargarPresupuesto(), cargarPartes()]);
      } else {
        // Agarrar el mejor mensaje posible
        const rawMsg = (data?.message || data?.error || '').toString();
        const msg = rawMsg.toLowerCase();

        const esSinStock =
          res.status === 409 ||
          msg.includes('stock insuficiente') ||
          msg.includes('sin stock');

        if (esSinStock) {
          alert('No hay stock suficiente para completar la compra.');
          await cargarPartes(); // refrescar catálogo
          return;
        }

        alert(`Error: ${rawMsg || 'No se pudo completar la compra'}`);
      }

    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con el servidor');
    } finally {
      setCargando(false);
    }
  }

  function abrirModalCompra(parte) {
    if (parte.stock === 0) {
      alert('Esta parte no tiene stock disponible');
      return;
    }
    setParteSeleccionada(parte);
    setCantidad(1);
    setModalCompra(true);
  }

  const partesFiltradas =
    filtroCategoria === 'todas'
      ? partes
      : partes.filter(p => p.categoria === filtroCategoria);

  const equipoActual = equipos.find(e => e.id_equipo === equipoSeleccionado);

  return (
    <div className="tienda-container">
      <h1 className="tienda-title">Tienda de Partes F1</h1>

      {/* Selector de Equipo */}
      <div className="selector-equipo">
        <label>Equipo Comprador:</label>
        <select
          value={equipoSeleccionado || ''}
          onChange={e => setEquipoSeleccionado(Number(e.target.value))}
          className="select-equipo"
          disabled={usuario?.rol === 'Engineer'} // Engineer no puede cambiar de equipo
        >
          {equipos.map(e => (
            <option key={e.id_equipo} value={e.id_equipo}>
              {e.nombre}
            </option>
          ))}
        </select>
        {usuario?.rol === 'Engineer' && (
          <small style={{ marginLeft: '1rem', color: '#999', fontSize: '0.85rem' }}>
            (Solo puedes comprar para tu equipo)
          </small>
        )}
      </div>

      {/* Panel de Presupuesto */}
      {presupuesto && (
        <div className="presupuesto-info">
          <h3>{equipoActual?.nombre}</h3>
          <div className="presupuesto-grid">
            <div className="presupuesto-item">
              <span className="label">Presupuesto Disponible:</span>
              <span className="value disponible">
                ${presupuesto.presupuesto_disponible?.toLocaleString()}
              </span>
            </div>
            <div className="presupuesto-item">
              <span className="label">Total Gastado:</span>
              <span className="value">${presupuesto.total_gastado?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filtros de Categoría */}
      <div className="filtros-container">
        <h3>Filtrar por categoría:</h3>
        <div className="filtros-buttons">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`filtro-btn ${filtroCategoria === cat ? 'active' : ''}`}
            >
              {cat === 'todas' ? 'Todas' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catálogo de Partes */}
      <div className="catalogo-section">
        <h2>Catálogo de Partes ({partesFiltradas.length})</h2>
        <div className="catalogo-grid">
          {partesFiltradas.length === 0 ? (
            <p className="empty-message">No hay partes disponibles en esta categoría</p>
          ) : (
            partesFiltradas.map(parte => (
              <div key={parte.id_parte} className="parte-card">
                <div className="parte-header">
                  <h4>{parte.nombre}</h4>
                  <span className="categoria-badge">{parte.categoria}</span>
                </div>

                <div className="parte-stats">
                  <div className="stat">
                    <span>P: {parte.P || parte.p || 0}</span>
                  </div>
                  <div className="stat">
                    <span>A: {parte.A || parte.a || 0}</span>
                  </div>
                  <div className="stat">
                    <span>M: {parte.M || parte.m || 0}</span>
                  </div>
                </div>

                <div className="parte-footer">
                  <div className="precio-stock">
                    <span className="precio">${parte.precio?.toLocaleString()}</span>
                    <span
                      className={`stock ${
                        parte.stock === 0 ? 'agotado' : parte.stock < 5 ? 'bajo' : ''
                      }`}
                    >
                      {parte.stock === 0 ? 'Agotado' : `Stock: ${parte.stock}`}
                    </span>
                  </div>
                  <button
                    onClick={() => abrirModalCompra(parte)}
                    disabled={parte.stock === 0}
                    className="btn btn-comprar"
                  >
                    {parte.stock === 0 ? 'Agotado' : 'Comprar'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Compra */}
      {modalCompra && parteSeleccionada && (
        <div className="modal-overlay" onClick={() => !cargando && setModalCompra(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Confirmar Compra</h3>

            <div className="compra-detalle">
              <h4>{parteSeleccionada.nombre}</h4>
              <p className="categoria-badge">{parteSeleccionada.categoria}</p>

              <div className="stats-compra">
                <span>Potencia: {parteSeleccionada.P || parteSeleccionada.p || 0}</span>
                <span>Aerodinámica: {parteSeleccionada.A || parteSeleccionada.a || 0}</span>
                <span>Manejo: {parteSeleccionada.M || parteSeleccionada.m || 0}</span>
              </div>

              <div className="precio-info">
                <p>
                  Precio unitario:{' '}
                  <strong>${parteSeleccionada.precio?.toLocaleString()}</strong>
                </p>
                <p>
                  Stock disponible: <strong>{parteSeleccionada.stock} unidades</strong>
                </p>
              </div>

              <div className="form-group">
                <label>Cantidad a comprar:</label>
                <input
                  type="number"
                  min="1"
                  max={parteSeleccionada.stock}
                  value={cantidad}
                  onChange={e =>
                    setCantidad(
                      Math.max(1, Math.min(parteSeleccionada.stock, Number(e.target.value)))
                    )
                  }
                  className="input-field"
                  disabled={cargando}
                />
              </div>

              <div className="total-compra">
                <p>Total a pagar:</p>
                <p className="total-valor">
                  ${(parteSeleccionada.precio * cantidad).toLocaleString()}
                </p>
              </div>

              {presupuesto && (
                <div className="validacion-presupuesto">
                  {parteSeleccionada.precio * cantidad > presupuesto.presupuesto_disponible ? (
                    <p className="error">Presupuesto insuficiente</p>
                  ) : (
                    <p className="success">Presupuesto suficiente</p>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setModalCompra(false)}
                className="btn btn-secondary"
                disabled={cargando}
              >
                Cancelar
              </button>
              <button
                onClick={realizarCompra}
                className="btn btn-primary"
                disabled={
                  cargando ||
                  cantidad < 1 ||
                  cantidad > parteSeleccionada.stock ||
                  (presupuesto &&
                    parteSeleccionada.precio * cantidad > presupuesto.presupuesto_disponible)
                }
              >
                {cargando ? 'Procesando...' : 'Confirmar Compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
