import { useState } from 'react'
import '../styles/usuarios.css'
export default function Inventario() {
  const [inventario] = useState([
    {
      equipo: 'Equipo Rojo',
      parte: 'Caja de Cambios V8',
      categoria: 'Caja de Cambios',
      cantidad: 1
    },
    {
      equipo: 'Equipo Rojo',
      parte: 'Alerón Pro',
      categoria: 'Paquete aerodinámico',
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
    <div className="usuarios-container">
      <h2 className="view-title">Inventario del Equipo</h2>

      <table className="usuarios-table">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Parte</th>
            <th>Categoría</th>
            <th>Cantidad</th>
          </tr>
        </thead>

        <tbody>
          {inventario.map((item, index) => (
            <tr key={index}>
              <td>{item.equipo}</td>
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
