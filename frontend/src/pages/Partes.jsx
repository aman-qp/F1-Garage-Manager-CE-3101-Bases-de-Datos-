import { useState } from 'react'

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
    <div>
      <h2>Catálogo de Partes</h2>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>P</th>
            <th>A</th>
            <th>M</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {partes.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.nombre}</td>
              <td>{p.categoria}</td>
              <td>₡{p.precio.toLocaleString()}</td>
              <td>{p.stock}</td>
              <td>{p.P}</td>
              <td>{p.A}</td>
              <td>{p.M}</td>
              <td>
                <button>Editar</button>{' '}
                <button>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      <button
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
        Agregar Parte
      </button>
    </div>
  )
}
