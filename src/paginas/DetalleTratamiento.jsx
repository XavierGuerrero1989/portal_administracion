import React, { useEffect, useState } from "react";
import "./DetalleTratamiento.scss";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, Plus, X } from "lucide-react";

const DetalleTratamiento = () => {
  const { idUsuario, idTratamiento } = useParams();
  const navigate = useNavigate();
  const [tratamiento, setTratamiento] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [medSeleccionado, setMedSeleccionado] = useState("");
  const [dias, setDias] = useState("");
  const [hora, setHora] = useState("");
  const [dosis, setDosis] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  useEffect(() => {
    const cargarTratamiento = async () => {
      const ref = doc(db, "usuarios", idUsuario, "tratamientos", idTratamiento);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setTratamiento(snap.data());
      }
    };
    cargarTratamiento();
  }, [idUsuario, idTratamiento]);

  const abrirModal = (med) => {
    setMedSeleccionado(med);
    setDias("");
    setDosis(tratamiento[med]?.dosis || "");
    setHora(tratamiento[med]?.hora || "");
    setModalVisible(true);
    setMensajeExito("");
  };

  const aplicarExtension = async () => {
    if (!medSeleccionado || !dias || !dosis || !hora) return;
    setGuardando(true);

    const ref = doc(db, "usuarios", idUsuario, "tratamientos", idTratamiento);
    const actualizado = { ...tratamiento };

    if (!actualizado[medSeleccionado]) actualizado[medSeleccionado] = {};

    actualizado[medSeleccionado].duracion =
      (actualizado[medSeleccionado].duracion || 5) + parseInt(dias);
    actualizado[medSeleccionado].hora = hora;
    actualizado[medSeleccionado].dosis = dosis;

    await updateDoc(ref, actualizado);

    await addDoc(collection(db, "usuarios", idUsuario, "historial"), {
      tipo: "modificacion",
      titulo: "Extensión del tratamiento",
      descripcion: `${medSeleccionado.toUpperCase()}: +${dias} días | Hora: ${hora} | Dosis: ${dosis}`,
      fecha: serverTimestamp(),
      autor: "Profesional",
    });

    setGuardando(false);
    setMensajeExito("Extensión aplicada correctamente ✔");
  };

  const parseFecha = (f) => {
    if (f?.toDate) return f.toDate();
    if (f instanceof Date) return f;
    return new Date(f);
  };

  if (!tratamiento) return <div className="detalle-tratamiento">Cargando...</div>;

  const medicamentos = ["fsh", "hmg", "antagonista", "oral"];

  return (
    <div className="detalle-tratamiento">
      <button className="volver" onClick={() => navigate("/tratamientos")}> <ArrowLeft size={18} /> Volver </button>

      <h2>Detalle del Tratamiento</h2>
      <p><strong>Tipo:</strong> {tratamiento.tipo}</p>
      <p><strong>Inicio:</strong> {parseFecha(tratamiento.fechaInicio).toLocaleDateString()}</p>
      <p><strong>Estado:</strong> {idTratamiento === "activo" ? "Activo" : "Finalizado"}</p>

      <h3>Medicamentos</h3>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Nombre</th>
            <th>Dosis</th>
            <th>Hora</th>
            <th>Días actuales</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {medicamentos.map((med) => (
            tratamiento[med] ? (
              <tr key={med}>
                <td>{med.toUpperCase()}</td>
                <td>{tratamiento[med].medicamento}</td>
                <td>{tratamiento[med].dosis}</td>
                <td>{tratamiento[med].hora}</td>
                <td>{tratamiento[med].duracion || 5} días</td>
                <td>
                  <button className="btn-extender" onClick={() => abrirModal(med)}>Extender</button>
                </td>
              </tr>
            ) : null
          ))}
        </tbody>
      </table>

      {modalVisible && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button className="cerrar" onClick={() => setModalVisible(false)}>
              <X size={20} />
            </button>
            <h4>Extender medicamento</h4>
            <label>
              Días:
              <input
                type="number"
                min="1"
                value={dias}
                onChange={(e) => setDias(e.target.value)}
              />
            </label>
            <label>
              Hora:
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </label>
            <label>
              Dosis:
              <input
                type="text"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
              />
            </label>
            {mensajeExito && <p className="mensaje-exito">{mensajeExito}</p>}
            <button className="aplicar" disabled={guardando || mensajeExito} onClick={aplicarExtension}>
              <Plus size={16} /> Aplicar Extensión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleTratamiento;
