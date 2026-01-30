import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import '../styles/usuarios.css';

export default function Inventario() {
  const { usuario } = useAuth();
  const [equipos, setEquipos] = useState([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarEquipos();
  }, []);

  useEffect(() => {
    if (equipoSeleccionado) {
      cargarInventario();
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

  async function cargarInventario() {
    setCargando(true);
    try {
      const res = await fetch(
        `${API_URL}/api/inventario/${equipoSeleccionado}`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        setInventario(data);
      }
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    } finally {
      setCargando(false);
    }
  }

  const equipoActual = equipos.find(e => e.id_equipo === equipoSeleccionado);

  return (
    <div className="usuarios-container">
      <h2 className="view-title">Inventario del Equipo</h2>

      {/* Selector de Equipo */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ 
          marginRight: '1rem', 
          color: 'white', 
          fontWeight: '600' 
        }}>
          Seleccionar Equipo:
        </label>
        <select
          value={equipoSeleccionado || ''}
          onChange={e => setEquipoSeleccionado(Number(e.target.value))}
          disabled={usuario?.rol === 'Engineer'}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            border: '2px solid #e74c3c',
            background: '#1a1a1a',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: usuario?.rol === 'Engineer' ? 'not-allowed' : 'pointer',
            minWidth: '250px',
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
          <small style={{ marginLeft: '1rem', color: '#999', fontSize: '0.85rem' }}>
            (Solo puedes ver el inventario de tu equipo)
          </small>
        )}
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'white' }}>
          <p>Cargando inventario...</p>
        </div>
      ) : inventario.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          background: 'rgba(26,26,26,0.8)',
          borderRadius: '12px',
          border: '1px solid #333'
        }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</p>
          <p style={{ color: '#666', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {equipoActual?.nombre} no tiene partes en inventario
          </p>
          <p style={{ color: '#555', fontSize: '0.95rem' }}>
            Ve a la Tienda para comprar partes
          </p>
        </div>
      ) : (
        <>
          <div style={{ 
            marginBottom: '1rem', 
            color: '#e74c3c', 
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>
            Inventario de: {equipoActual?.nombre} ({inventario.length} tipos de partes)
          </div>

          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Parte</th>
                <th>Categoría</th>
                <th>Cantidad</th>
                <th>Potencia (P)</th>
                <th>Aerodinámica (A)</th>
                <th>Manejo (M)</th>
                <th>Fecha Adquisición</th>
              </tr>
            </thead>

            <tbody>
              {inventario.map((item, index) => (
                <tr key={index}>
                  <td style={{ fontWeight: '600' }}>{item.nombre_parte}</td>
                  <td>
                    <span style={{
                      background: 'rgba(231,76,60,0.2)',
                      color: '#e74c3c',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      {item.categoria}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      background: '#2ecc71',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontWeight: '700'
                    }}>
                      {item.cantidad}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{item.p}</td>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{item.a}</td>
                  <td style={{ textAlign: 'center', fontWeight: '600' }}>{item.m}</td>
                  <td>{new Date(item.fecha_adquisicion).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Resumen de totales */}
          <div style={{
            marginTop: '2rem',
            padding: '1.5rem',
            background: 'rgba(231,76,60,0.1)',
            borderRadius: '12px',
            border: '2px solid #e74c3c'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#e74c3c' }}>
              Resumen del Inventario
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: '0', color: '#999', fontSize: '0.9rem' }}>Total de Tipos de Partes:</p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>
                  {inventario.length}
                </p>
              </div>
              <div>
                <p style={{ margin: '0', color: '#999', fontSize: '0.9rem' }}>Total de Piezas:</p>
                <p style={{ margin: '0.25rem 0 0 0', color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>
                  {inventario.reduce((sum, item) => sum + item.cantidad, 0)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}