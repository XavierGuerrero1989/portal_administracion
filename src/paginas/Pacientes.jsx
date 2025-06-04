// Pacientes.jsx
import "./Pacientes.scss";

import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import ConfirmModal from "../componentes/ConfirmModal";

const Pacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modalVisible, setModalVisible] = useState(false);
  const [pacienteAEliminar, setPacienteAEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");
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
      const coincideEstado = filtroEstado === "todos" || p.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  };

  const abrirModal = (paciente) => {
    setPacienteAEliminar(paciente);
    setMensajeExito("");
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setPacienteAEliminar(null);
    setMensajeExito("");
  };

  const eliminarPaciente = async () => {
    try {
      setEliminando(true);
      const res = await fetch(
        `https://us-central1-appfertilidad.cloudfunctions.net/eliminarPacienteConTodo?id=${pacienteAEliminar.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error("Error al eliminar el paciente");

      setPacientes((prev) => prev.filter((p) => p.id !== pacienteAEliminar.id));
      setMensajeExito("Paciente eliminado correctamente.");
      setTimeout(() => cerrarModal(), 2000);
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error al eliminar.");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="pacientes-container">
      <div className="header1">
        <h2>PACIENTES</h2>
        <div className="acciones">
          <input
            type="text"
            placeholder="Buscar por nombre, DNI o email"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
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
                <Link to={`/pacientes/${p.id}/perfil`} title="Ver perfil">
                  <button>🔍</button>
                </Link>
                
                <Link to={`/pacientes/${p.id}/historial`} title="historial">
                  <button>📂</button>
                </Link>
                <Link to={`/pacientes/${p.id}/evolucion`} title="Evolucion">
                  <button>📈</button>
                </Link>
                <button title="Eliminar" onClick={() => abrirModal(p)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmModal
        isOpen={modalVisible}
        onClose={cerrarModal}
        onConfirm={eliminarPaciente}
        loading={eliminando}
        titulo={mensajeExito ? "Éxito" : "¿Estás seguro?"}
        mensaje={mensajeExito ? "" : `Se eliminará al paciente ${pacienteAEliminar?.nombre} ${pacienteAEliminar?.apellido}`}
        mensajeExito={mensajeExito}
      />
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
