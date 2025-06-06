// DetalleTratamiento.jsx restaurado y mejorado

import React, { useEffect, useState } from "react";
import "./DetalleTratamiento.scss";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { ArrowLeft, Plus, X, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock } from "lucide-react";

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
  const [conteoMedicamentos, setConteoMedicamentos] = useState({});
  const [notificaciones, setNotificaciones] = useState([]);
  const [medsAbiertos, setMedsAbiertos] = useState({});

  useEffect(() => {
    const cargarDatos = async () => {
      const ref = doc(db, "usuarios", idUsuario, "tratamientos", idTratamiento);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      setTratamiento(data);

      const notisSnap = await getDocs(collection(db, "usuarios", idUsuario, "notificaciones"));
      const todas = notisSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setNotificaciones(todas);

      const contador = {};
      const medicamentosDelTratamiento = Object.values(data)
        .filter((m) => m?.medicamento)
        .map((m) => m.medicamento);

      todas.forEach((n) => {
        if (n.tipo === "primaria" && n.medicamento) {
          medicamentosDelTratamiento.forEach((nombre) => {
            if (n.medicamento.trim().toLowerCase() === nombre.trim().toLowerCase()) {
              contador[nombre] = (contador[nombre] || 0) + 1;
            }
          });
        }
      });

      setConteoMedicamentos(contador);
    };

    cargarDatos();
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

    const fechaInicio = parseFecha(tratamiento.fechaInicio);
    const existentes = notificaciones.filter(
      (n) =>
        n.tipo === "primaria" &&
        n.medicamento?.trim().toLowerCase() === tratamiento[medSeleccionado].medicamento.trim().toLowerCase()
    );

    const nuevas = [];
    for (let i = 0; i < parseInt(dias); i++) {
      const offset = existentes.length + i;
      const base = new Date(fechaInicio);
      base.setDate(base.getDate() + offset);

      const [h, m] = hora.split(":").map(Number);
base.setHours(h, m, 0, 0);

      base.setHours(h, m, 0, 0);

      const fechaP = new Date(base);
      const fechaS = new Date(base.getTime() - 10 * 60000);
      const fechaT = new Date(base.getTime() - 30 * 60000);
      const med = tratamiento[medSeleccionado].medicamento;

      nuevas.push(
        { fecha: Timestamp.fromDate(fechaP), hora, medicamento: med, dosis, tipo: "primaria", confirmada: false, creada: serverTimestamp() },
        { fecha: Timestamp.fromDate(fechaS), hora, medicamento: med, dosis, tipo: "secundaria", confirmada: false, creada: serverTimestamp() },
        { fecha: Timestamp.fromDate(fechaT), hora, medicamento: med, dosis, tipo: "terciaria", confirmada: false, creada: serverTimestamp() }
      );
    }

    const ref = collection(db, "usuarios", idUsuario, "notificaciones");
    await Promise.all(nuevas.map((n) => addDoc(ref, n)));

    await addDoc(collection(db, "usuarios", idUsuario, "historial"), {
      tipo: "modificacion",
      titulo: "Extensión del tratamiento",
      descripcion: `${medSeleccionado.toUpperCase()}: +${dias} días | Hora: ${hora} | Dosis: ${dosis}`,
      fecha: serverTimestamp(),
      autor: "Profesional",
    });

    setGuardando(false);
    setMensajeExito("Extensión aplicada y notificaciones generadas ✔");
  };

  const parseFecha = (f) => (f?.toDate ? f.toDate() : new Date(f));
  const toggleAccordion = (med) => setMedsAbiertos((prev) => ({ ...prev, [med]: !prev[med] }));
  const esActivo = idTratamiento === "activo";
  const medicamentos = ["fsh", "hmg", "antagonista", "viaOral"];

  const renderEstado = (confirmada) => (
    <span className="estado-confirmacion">
      {confirmada ? <CheckCircle size={16} color="#4caf50" /> : <XCircle size={16} color="#e53935" />}
      {confirmada ? " Confirmada" : " Sin confirmar"}
    </span>
  );

  return (
    <div className="detalle-tratamiento">
      <button className="volver" onClick={() => navigate("/tratamientos")}><ArrowLeft size={18} /> Volver</button>
      <h2>Detalle del Tratamiento</h2>
      <p><strong>Tipo:</strong> {tratamiento?.tipo}</p>
      <p><strong>Inicio:</strong> {parseFecha(tratamiento?.fechaInicio).toLocaleDateString()}</p>
      <p><strong>Estado:</strong> {esActivo ? "Activo" : "Finalizado"}</p>

      <h3>Medicamentos</h3>
      {medicamentos.map((med) => {
        const datos = tratamiento?.[med];
        if (!datos) return null;
        const nombre = datos.medicamento;
        const eventos = notificaciones.filter((n) => n.medicamento?.toLowerCase() === nombre.toLowerCase() && n.tipo === "primaria");
        const abiertos = medsAbiertos[med];

        return (
          <div key={med} className="acordeon">
            <div className="acordeon-header" onClick={() => toggleAccordion(med)}>
              <div className="info">
                <strong>{med.toUpperCase()}</strong> – {nombre} – {eventos.length} días
              </div>
              <div className="acciones">
                {abiertos ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>
            {abiertos && (
              <div className="acordeon-body">
                <p><strong>Dosis:</strong> {datos.dosis}</p>
                <p><strong>Hora:</strong> {datos.hora}</p>
                <ul>
                  {eventos.sort((a, b) => a.fecha.seconds - b.fecha.seconds).map((ev, i) => (
                    <li key={i}>
                      {new Date(ev.fecha.seconds * 1000).toLocaleDateString()} {" "}– {renderEstado(ev.confirmada)}
                    </li>
                  ))}
                </ul>
                {esActivo && (
                  <button className="btn-extender" onClick={() => abrirModal(med)}>Extender</button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {modalVisible && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button className="cerrar" onClick={() => setModalVisible(false)}><X size={20} /></button>
            <h4>Extender medicamento</h4>
            <label>Días:<input type="number" min="1" value={dias} onChange={(e) => setDias(e.target.value)} /></label>
            <label>Hora:<input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
            <label>Dosis:<input type="text" value={dosis} onChange={(e) => setDosis(e.target.value)} /></label>
            {mensajeExito && <p className="mensaje-exito">{mensajeExito}</p>}
            <button className="aplicar" disabled={guardando || mensajeExito} onClick={aplicarExtension}><Plus size={16} /> Aplicar Extensión</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleTratamiento;
