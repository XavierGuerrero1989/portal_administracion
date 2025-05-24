// Pacientes.jsx

import "./Pacientes.scss";

import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const Pacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const navigate = useNavigate();

  useEffect(() => {
  const cargarPacientes = async () => {
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    const data = await Promise.all(
      querySnapshot.docs.map(async (docSnap) => {
        const paciente = { id: docSnap.id, ...docSnap.data() };

        let estado = "sin-tratamiento";
        const tratamientoRef = doc(db, "usuarios", paciente.id, "tratamientos", "activo");
        const tratamientoSnap = await getDoc(tratamientoRef);
        if (tratamientoSnap.exists()) {
          const data = tratamientoSnap.data();
          estado = data.activo === true ? "activo" : "finalizado";
        }

        return { ...paciente, estado };
      })
    );

    // 🧼 Filtramos los que no sean médicos
    const soloPacientes = data.filter((p) => p.role !== "medico");
    setPacientes(soloPacientes);
  };

  cargarPacientes();
}, []);


  const filtrarPacientes = () => {
    return pacientes.filter((p) => {
      const coincideBusqueda = `${p.nombre} ${p.apellido} ${p.dni} ${p.email}`
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      const coincideEstado =
        filtroEstado === "todos" || p.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  };

  return (
    <div className="pacientes-container">
      <div className="header">
        <h2>PACIENTES</h2>
        <div className="acciones">
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o email"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Con tratamiento activo</option>
            <option value="finalizado">Finalizado</option>
            <option value="sin-tratamiento">Sin tratamiento</option>
          </select>
          <button className="nuevo" onClick={() => navigate("/pacientes/nuevo")}>
            + Nuevo paciente
          </button>
        </div>
      </div>

      <table className="tabla-pacientes">
        <thead>
          <tr>
            <th>Nombre completo</th>
            <th>DNI</th>
            <th>Email</th>
            <th>Teléfono</th>
            <th>Edad</th>
            <th>Estado</th>
            <th>Fecha creación</th>
            <th>Última actualización</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtrarPacientes().map((p) => (
            <tr key={p.id}>
              <td>{p.nombre} {p.apellido}</td>
              <td>{p.dni}</td>
              <td>{p.email}</td>
              <td>{p.telefono || "-"}</td>
              <td>{calcularEdad(p.fechaNacimiento)}</td>
              <td><span className={`badge ${p.estado}`}>{estadoTexto(p.estado)}</span></td>
              <td>{formatearFecha(p.fechaCreacion)}</td>
              <td>{formatearFecha(p.ultimaActualizacion)}</td>
              <td className="acciones">
                <button title="Ver perfil">🔍</button>
                <button title="Historial">🗂️</button>
                <button title="Evolución">📈</button>
                <button title="Editar">✏️</button>
                <button title="Eliminar">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return "-";
  const hoy = new Date();
  const nac = new Date(fechaNac);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
};

const formatearFecha = (fecha) => {
  if (!fecha?.toDate) return "-";
  return fecha.toDate().toLocaleDateString();
};

const estadoTexto = (estado) => {
  switch (estado) {
    case "activo":
      return "Tratamiento activo";
    case "finalizado":
      return "Finalizado";
    case "sin-tratamiento":
      return "Sin tratamiento";
    default:
      return "-";
  }
};

export default Pacientes;
