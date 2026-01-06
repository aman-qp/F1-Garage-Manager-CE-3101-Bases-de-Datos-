import { useState } from 'react'

export default function Inventario() {
  const [inventario] = useState([
    {
      equipo: 'Equipo Rojo',
      parte: 'Motor V8',
      categoria: 'Motor',
      cantidad: 1
    },
    {
      equipo: 'Equipo Rojo',
      parte: 'Alerón Pro',
      categoria: 'Aerodinámica',
      cantidad: 1
    },
    {
      equipo: 'Equipo Rojo',
      parte: 'Neumáticos Soft',
      categoria: 'Neumáticos',
      cantidad: 2
    }
  ])

  return (
    <div>
      <h2>Inventario del Equipo</h2>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Parte</th>
            <th>Categoría</th>
            <th>Cantidad</th>
          </tr>
        </thead>

        <tbody>
          {inventario.map((item, index) => (
            <tr key={index}>
              <td>{item.parte}</td>
              <td>{item.categoria}</td>
              <td>{item.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
