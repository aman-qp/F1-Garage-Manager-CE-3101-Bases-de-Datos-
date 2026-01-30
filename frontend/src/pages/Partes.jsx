import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import '../styles/partes.css';

export default function Partes() {
  const [partes, setPartes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [parteActual, setParteActual] = useState({
    id_parte: null,
    nombre: '',
    id_categoria: '',
    potencia: 0,
    aerodinamica: 0,
    manejo: 0,
    precio_catalogo: 0,
    stock: 0
  });

  useEffect(() => {
    cargarPartes();
    cargarCategorias();
  }, []);

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

  async function cargarCategorias() {
    try {
      const res = await fetch(`${API_URL}/api/categorias`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setCategorias(data);
      }
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  }

  function abrirModalCrear() {
    setModoEdicion(false);
    setParteActual({
      id_parte: null,
      nombre: '',
      id_categoria: categorias[0]?.id_categoria || '',
      potencia: 0,
      aerodinamica: 0,
      manejo: 0,
      precio_catalogo: 0,
      stock: 0
    });
    setModalAbierto(true);
  }

  function abrirModalEditar(parte) {
    setModoEdicion(true);
    // Buscar el id_categoria correspondiente
    const cat = categorias.find(c => c.tipo_de_parte === parte.categoria);
    setParteActual({
      id_parte: parte.id_parte,
      nombre: parte.nombre,
      id_categoria: cat?.id_categoria || '',
      potencia: parte.P,
      aerodinamica: parte.A,
      manejo: parte.M,
      precio_catalogo: parte.precio,
      stock: parte.stock
    });
    setModalAbierto(true);
  }

  async function guardarParte(e) {
    e.preventDefault();

    // Validaciones
    if (!parteActual.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }

    if (parteActual.potencia < 0 || parteActual.potencia > 9 ||
        parteActual.aerodinamica < 0 || parteActual.aerodinamica > 9 ||
        parteActual.manejo < 0 || parteActual.manejo > 9) {
      alert('P, A y M deben estar entre 0 y 9');
      return;
    }

    if (parteActual.precio_catalogo < 0 || parteActual.stock < 0) {
      alert('Precio y stock deben ser positivos');
      return;
    }

    try {
      const url = modoEdicion 
        ? `${API_URL}/api/partes/${parteActual.id_parte}`
        : `${API_URL}/api/partes`;
      
      const method = modoEdicion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nombre: parteActual.nombre,
          id_categoria: parseInt(parteActual.id_categoria),
          potencia: parseInt(parteActual.potencia),
          aerodinamica: parseInt(parteActual.aerodinamica),
          manejo: parseInt(parteActual.manejo),
          precio_catalogo: parseFloat(parteActual.precio_catalogo),
          stock: parseInt(parteActual.stock)
        })
      });

      if (res.ok) {
        alert(modoEdicion ? 'Parte actualizada exitosamente' : 'Parte creada exitosamente');
        setModalAbierto(false);
        cargarPartes();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al guardar la parte');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con el servidor');
    }
  }

  async function eliminarParte(id) {
    if (!confirm('¿Estás seguro de eliminar esta parte?')) return;

    try {
      const res = await fetch(`${API_URL}/api/partes/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        alert('Parte eliminada exitosamente');
        cargarPartes();
      } else {
        const data = await res.json();
        alert(data.message || 'Error al eliminar la parte');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('No se pudo conectar con el servidor');
    }
  }

  return (
    <div className="cards-container">
      <h1 className="page-title">Catálogo de Partes</h1>

      <div className="cards-grid">
        {partes.length === 0 ? (
          <p className="empty-message">No hay partes registradas</p>
        ) : (
          partes.map(p => (
            <div key={p.id_parte} className="f1-card">
              <h3>{p.nombre}</h3>
              <span className="card-category">{p.categoria}</span>

              <div className="card-info">
                <p><strong> Precio:</strong> ${p.precio?.toLocaleString()}</p>
                <p><strong> Stock:</strong> {p.stock}</p>
              </div>

              <div className="stats">
                <span className="stat-item"> P: {p.P}</span>
                <span className="stat-item"> A: {p.A}</span>
                <span className="stat-item"> M: {p.M}</span>
              </div>

              {/*
              <div className="card-actions">
                <button 
                  className="btn btn-edit"
                  onClick={() => abrirModalEditar(p)}
                >
                  Editar
                </button>
                <button 
                  className="btn btn-delete"
                  onClick={() => eliminarParte(p.id_parte)}
                >
                  Eliminar
                </button>
              </div>
              */}
            </div>
          ))
        )}
      </div>

      <button className="btn btn-add" onClick={abrirModalCrear}>
        + Agregar Parte
      </button>

      {/* Modal para Crear/Editar */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modoEdicion ? 'Editar Parte' : 'Nueva Parte'}</h2>
            
            <form onSubmit={guardarParte}>
              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  value={parteActual.nombre}
                  onChange={e => setParteActual({...parteActual, nombre: e.target.value})}
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label>Categoría:</label>
                <select
                  value={parteActual.id_categoria}
                  onChange={e => setParteActual({...parteActual, id_categoria: e.target.value})}
                  className="input-field"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {categorias.map(cat => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.tipo_de_parte}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label> Potencia (0-9):</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={parteActual.potencia}
                    onChange={e => setParteActual({...parteActual, potencia: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label> Aerodinámica (0-9):</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={parteActual.aerodinamica}
                    onChange={e => setParteActual({...parteActual, aerodinamica: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label> Manejo (0-9):</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    value={parteActual.manejo}
                    onChange={e => setParteActual({...parteActual, manejo: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label> Precio:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={parteActual.precio_catalogo}
                    onChange={e => setParteActual({...parteActual, precio_catalogo: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>

                <div className="form-group">
                  <label> Stock:</label>
                  <input
                    type="number"
                    min="0"
                    value={parteActual.stock}
                    onChange={e => setParteActual({...parteActual, stock: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)} 
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {modoEdicion ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}