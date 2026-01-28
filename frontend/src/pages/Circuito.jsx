import { useEffect, useState } from "react"
import "../styles/circuito.css"

export default function CircuitosAdmin() {
  const [circuitos, setCircuitos] = useState([])
  const [loading, setLoading] = useState(false)

  // mensajes separados
  const [msg, setMsg] = useState("")
  const [errorForm, setErrorForm] = useState("")
  const [errorTabla, setErrorTabla] = useState("")

  // form crear
  const [nombre, setNombre] = useState("")
  const [distancia, setDistancia] = useState("")
  const [curvas, setCurvas] = useState("")

  // edición inline
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState("")
  const [editDistancia, setEditDistancia] = useState("")
  const [editCurvas, setEditCurvas] = useState("")

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setErrorForm("")
    setErrorTabla("")
    setMsg("")
    setLoading(true)

    try {
      const res = await fetch("http://localhost:3001/api/circuitos", {
        credentials: "include",
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorTabla(data.message || "No se pudo cargar")
        return
      }

      setCircuitos(data)
    } catch {
      setErrorTabla("No se pudo conectar al servidor")
    } finally {
      setLoading(false)
    }
  }

  async function crearCircuito(e) {
    e.preventDefault()
    setErrorForm("")
    setMsg("")
    // si venís de un delete fallido, lo limpiamos para que no “ensucie”
    setErrorTabla("")

    const payload = {
      nombre: nombre.trim(),
      distancia_total: Number(distancia),
      cantidad_curvas: Number(curvas),
    }

    if (!payload.nombre) return setErrorForm("Nombre requerido")
    if (!payload.distancia_total || payload.distancia_total <= 0) return setErrorForm("Debe ingresar una distancia")
    if (Number.isNaN(payload.cantidad_curvas) || payload.cantidad_curvas < 0) return setErrorForm("La cantidad de curvas debe ser mayor o igual a 0")

    try {
      const res = await fetch("http://localhost:3001/api/circuitos", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorForm(data.message || "Error creando circuito")
        return
      }

      setMsg("Circuito creado ✅")
      setNombre("")
      setDistancia("")
      setCurvas("")
      await cargar()
    } catch {
      setErrorForm("No se pudo conectar al servidor")
    }
  }

  function iniciarEdicion(c) {
    setMsg("")
    setErrorForm("")
    setErrorTabla("")
    setEditId(c.id_circuito)
    setEditNombre(c.nombre)
    setEditDistancia(String(c.distancia_total))
    setEditCurvas(String(c.cantidad_curvas))
  }

  function cancelarEdicion() {
    setEditId(null)
    setEditNombre("")
    setEditDistancia("")
    setEditCurvas("")
  }

  async function guardarEdicion(id) {
    setErrorForm("")
    setMsg("")
    setErrorTabla("")

    const payload = {
      nombre: editNombre.trim(),
      distancia_total: Number(editDistancia),
      cantidad_curvas: Number(editCurvas),
    }

    if (!payload.nombre) return setErrorForm("Nombre requerido")
    if (!payload.distancia_total || payload.distancia_total <= 0) return setErrorForm("Distancia debe ser > 0")
    if (Number.isNaN(payload.cantidad_curvas) || payload.cantidad_curvas < 0) return setErrorForm("Curvas debe ser >= 0")

    try {
      const res = await fetch(`http://localhost:3001/api/circuitos/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorForm(data.message || "Error actualizando")
        return
      }

      setMsg("Circuito actualizado ✅")
      cancelarEdicion()
      await cargar()
    } catch {
      setErrorForm("No se pudo conectar al servidor")
    }
  }

  async function eliminarCircuito(id) {
    setErrorTabla("")
    setMsg("")
    // para que el error NO salga arriba
    setErrorForm("")

    const ok = confirm("¿Seguro que querés eliminar este circuito?")
    if (!ok) return

    try {
      const res = await fetch(`http://localhost:3001/api/circuitos/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorTabla(data.message || "No se pudo eliminar")
        return
      }

      setMsg("Circuito eliminado ✅")
      await cargar()
    } catch {
      setErrorTabla("No se pudo conectar al servidor")
    }
  }

  return (
    <div className="circuitos-page">
      <h2>Administrar Circuitos</h2>

      {/* =================== CARD ARRIBA (FORM) =================== */}
      <div className="card">
        <h3>Crear circuito</h3>

        <form className="form" onSubmit={crearCircuito}>
          <div className="grid">
            <label>
              Nombre
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Monaco" />
            </label>

            <label>
              Distancia total (km)
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={distancia}
                onChange={(e) => setDistancia(e.target.value)}
                placeholder="Ej: 305.50"
              />
            </label>

            <label>
              Cantidad de curvas
              <input
                type="number"
                min="0"
                value={curvas}
                onChange={(e) => setCurvas(e.target.value)}
                placeholder="Ej: 19"
              />
            </label>
          </div>

          <button className="btn primary" type="submit">
            Agregar
          </button>
        </form>

        {/* Mensajes SOLO del form */}
        {msg && <p className="msg ok">{msg}</p>}
        {errorForm && <p className="msg err">{errorForm}</p>}
      </div>

      {/* =================== CARD ABAJO (TABLA) =================== */}
      <div className="card">
        <div className="header-row">
          <h3>Lista de circuitos</h3>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Distancia (km)</th>
                <th>Curvas</th>
                <th className="acciones">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {circuitos.map((c) => {
                const editando = editId === c.id_circuito
                return (
                  <tr key={c.id_circuito}>
                    <td>{c.id_circuito}</td>

                    <td>
                      {editando ? (
                        <input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
                      ) : (
                        c.nombre
                      )}
                    </td>

                    <td>
                      {editando ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={editDistancia}
                          onChange={(e) => setEditDistancia(e.target.value)}
                        />
                      ) : (
                        Number(c.distancia_total).toFixed(2)
                      )}
                    </td>

                    <td>
                      {editando ? (
                        <input
                          type="number"
                          min="0"
                          value={editCurvas}
                          onChange={(e) => setEditCurvas(e.target.value)}
                        />
                      ) : (
                        c.cantidad_curvas
                      )}
                    </td>

                    <td className="acciones">
                      {!editando ? (
                        <>
                          <button className="btn edit" onClick={() => iniciarEdicion(c)}>
                            Editar
                          </button>
                          <button className="btn danger" onClick={() => eliminarCircuito(c.id_circuito)}>
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn primary" onClick={() => guardarEdicion(c.id_circuito)}>
                            Guardar
                          </button>
                          <button className="btn" onClick={cancelarEdicion}>
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}

              {circuitos.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="empty">
                    No hay circuitos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mensajes SOLO de la tabla (ej: eliminar) */}
        {errorTabla && <p className="msg err">{errorTabla}</p>}
      </div>
    </div>
  )
}
