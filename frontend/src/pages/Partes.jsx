import { useState } from 'react'
import '../styles/card.css'
export default function Partes() {
  const [partes, setPartes] = useState([
    {
      id: 1,
      nombre: 'Motor V8',
      categoria: 'Motor',
      precio: 500000,
      stock: 5,
      P: 80,
      A: 60,
      M: 40
    },
    {
      id: 2,
      nombre: 'Alerón Pro',
      categoria: 'Aerodinámica',
      precio: 250000,
      stock: 8,
      P: 40,
      A: 85,
      M: 30
    },
    {
      id: 3,
      nombre: 'Neumáticos Soft',
      categoria: 'Neumáticos',
      precio: 180000,
      stock: 12,
      P: 30,
      A: 40,
      M: 90
    }
  ])

   return (
    <div className="cards-container">

      <div className="cards-grid">
        {partes.map(p => (
          <div key={p.id} className="f1-card">
            <h3>{p.nombre}</h3>
            <span className="card-category">{p.categoria}</span>

            <p><strong>Precio:</strong> ₡{p.precio.toLocaleString()}</p>
            <p><strong>Stock:</strong> {p.stock}</p>

            <div className="stats">
              <span>🏎 P: {p.P}</span>
              <span>🌬 A: {p.A}</span>
              <span>🛞 M: {p.M}</span>
            </div>

            <div className="card-actions">
              <button className="btn btn-edit">Editar</button>
              <button className="btn btn-delete">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-add"
        onClick={() =>
          setPartes([
            ...partes,
            {
              id: partes.length + 1,
              nombre: 'Nueva Parte',
              categoria: 'Motor',
              precio: 0,
              stock: 0,
              P: 0,
              A: 0,
              M: 0
            }
          ])
        }
      >
        + Agregar Parte
      </button>
    </div>
  )
}
