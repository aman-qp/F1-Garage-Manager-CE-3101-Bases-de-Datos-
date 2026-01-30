import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import '../styles/driver.css';

export default function PerfilDriver() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarPerfil();
  }, []);

  async function cargarPerfil() {
    try {
      const res = await fetch(`${API_URL}/api/conductor/me`, {
        credentials: 'include'
      });

      if (res.ok) {
        const datos = await res.json();
        setData(datos);
      } else {
        console.error('Error al cargar perfil');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="driver-container">
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (!data || !data.perfil) {
    return (
      <div className="driver-container">
        <div className="warning-box">
          <h3>Error al cargar perfil</h3>
          <p>No se pudo obtener la información del perfil.</p>
        </div>
      </div>
    );
  }

  const { perfil, resultados, estadisticas } = data;

  return (
    <div className="driver-container">
      <h1 className="driver-title">Mi Perfil de Conductor</h1>

      {/* Tarjeta de Perfil */}
      <div className="perfil-card">
        <div className="perfil-header">
          <h2>{perfil.nombre_completo}</h2>
          <span className="perfil-username">@{perfil.nombre_usuario}</span>
        </div>

        <div className="perfil-info">
          <div className="info-item">
            <span className="info-label">Equipo</span>
            <span className={`info-value ${!perfil.nombre_equipo ? 'sin-equipo' : ''}`}>
              {perfil.nombre_equipo || 'No pertenece a ningún equipo'}
            </span>
          </div>

          {perfil.es_conductor ? (
            <>
              <div className="info-item">
                <span className="info-label">Habilidad</span>
                <div className="habilidad-container">
                  <div className="habilidad-bar">
                    <div 
                      className="habilidad-fill" 
                      style={{ width: `${perfil.habilidad_h}%` }}
                    />
                  </div>
                  <span className="habilidad-valor">{perfil.habilidad_h}</span>
                </div>
              </div>

              <div className="info-item">
                <span className="info-label">Carro Asignado</span>
                <span className="info-value">
                  {perfil.id_carro 
                    ? `Carro #${perfil.id_carro} - ${perfil.estado_carro}` 
                    : 'Sin asignar'}
                </span>
              </div>

              <div className="info-item">
                <span className="info-label">Estado</span>
                <span className="estado-conductor activo">
                  Conductor Activo
                </span>
              </div>
            </>
          ) : (
            <div className="info-item">
              <span className="info-label">Estado</span>
              <span className="estado-conductor inactivo">
                Driver sin equipo asignado
              </span>
              <p className="info-note">
                Contacta al administrador para que te asigne a un equipo y te convierta en conductor activo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas - Solo si es conductor */}
      <>
        <div className="estadisticas-grid">
            <div className="stat-box">
            <span className="stat-label">Carreras</span>
            <span className="stat-value">{estadisticas.total_carreras}</span>
            </div>

            <div className="stat-box">
            <span className="stat-label">Victorias</span>
            <span className="stat-value victorias">{estadisticas.victorias}</span>
            </div>

            <div className="stat-box">
            <span className="stat-label">Podios</span>
            <span className="stat-value podios">{estadisticas.podios}</span>
            </div>

            <div className="stat-box">
            <span className="stat-label">Mejor Posición</span>
            <span className="stat-value">
                {estadisticas.mejor_posicion ? `P${estadisticas.mejor_posicion}` : '-'}
            </span>
            </div>

            <div className="stat-box">
            <span className="stat-label">Posición Promedio</span>
            <span className="stat-value">
                {estadisticas.posicion_promedio && Number(estadisticas.posicion_promedio) > 0
                ? `P${Number(estadisticas.posicion_promedio).toFixed(1)}`
                : '-'}
            </span>
            </div>
        </div>

        <div className="resultados-section">
            <h3>Historial de Carreras</h3>

            {/* Mensajito si NO está activo */}
            {!perfil.es_conductor && (
            <div className="warning-box" style={{ marginBottom: '1.5rem' }}>
                <h3>Conductor no activo</h3>
                <p>
                Actualmente no estás asignado como conductor activo, pero aquí se mantiene tu historial y estadísticas.
                </p>
            </div>
            )}

            {resultados.length === 0 ? (
            <div className="empty-box">
                <p>No hay carreras registradas</p>
                <p className="empty-subtitle">
                Cuando participes en simulaciones, tus resultados aparecerán aquí
                </p>
            </div>
            ) : (
            <div className="resultados-grid">
                {resultados.map((r, idx) => (
                <div key={idx} className="resultado-card">
                    <div className="resultado-header">
                    <h4>{r.nombre_circuito}</h4>
                    <span className="resultado-fecha">
                        {r.fecha_hora ? new Date(r.fecha_hora).toLocaleDateString() : '-'}
                    </span>
                    </div>

                    <div className="resultado-equipo">
                    <span className="equipo-badge">{r.nombre_equipo}</span>
                    </div>

                    <div className="resultado-posicion">
                    <span className={`posicion-badge p${r.posicion}`}>
                        P{r.posicion}
                    </span>
                    <span className="tiempo-total">
                        {r.tiempo_total != null ? `${Number(r.tiempo_total).toFixed(3)}s` : '-'}
                    </span>
                    </div>

                    <div className="resultado-stats">
                    <div className="stat-mini"><span>P: {r.p_usado ?? '-'}</span></div>
                    <div className="stat-mini"><span>A: {r.a_usado ?? '-'}</span></div>
                    <div className="stat-mini"><span>M: {r.m_usado ?? '-'}</span></div>
                    </div>

                    <div className="resultado-detalles">
                    <p>Velocidad Recta: {r.velocidad_recta != null ? Number(r.velocidad_recta).toFixed(2) : '-'} km/h</p>
                    <p>Velocidad Curva: {r.velocidad_curva != null ? Number(r.velocidad_curva).toFixed(2) : '-'} km/h</p>
                    <p>Penalización: {r.penalizacion != null ? Number(r.penalizacion).toFixed(2) : '-'}s</p>
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
      </>
    </div>
  );
}