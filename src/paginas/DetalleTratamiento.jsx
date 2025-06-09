// DetalleTratamiento.jsx restaurado y mejorado con medicamentos renderizados uno por uno

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
  updateDoc,
  arrayUnion,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import {
  ArrowLeft,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Download,
  Trash
} from "lucide-react";




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

  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDosis, setNuevoDosis] = useState("");
  const [nuevoHora, setNuevoHora] = useState("");
  const [nuevoDias, setNuevoDias] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [mensajeNuevoExito, setMensajeNuevoExito] = useState("");

  const [estudios, setEstudios] = useState([]);

  const [modalAgregarEstudio, setModalAgregarEstudio] = useState(false);

  const [nuevoTipoEstudio, setNuevoTipoEstudio] = useState("");
const [nuevaFechaEstudio, setNuevaFechaEstudio] = useState("");
const [progesterona, setProgesterona] = useState("");
const [estradiol, setEstradiol] = useState("");
const [lh, setLh] = useState("");
const [izquierdo, setIzquierdo] = useState("");
const [derecho, setDerecho] = useState("");
const [foliculos, setFoliculos] = useState("");





  const cargarEstudios = async () => {
  const ref = collection(db, "usuarios", idUsuario, "tratamientos", idTratamiento, "estudios");
  const snap = await getDocs(ref);
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  setEstudios(lista.sort((a, b) => b.fecha?.seconds - a.fecha?.seconds));
};

const eliminarEstudio = async (id) => {
  const ref = doc(db, "usuarios", idUsuario, "tratamientos", idTratamiento, "estudios", id);
  await deleteDoc(ref);
  await cargarEstudios();
};



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
      .flatMap((m) => Array.isArray(m) ? m : [m])
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

  useEffect(() => {
  cargarDatos();
  cargarEstudios();
}, [idUsuario, idTratamiento]);


  const abrirModal = (clave) => {
    const [tipo, index] = clave.split("-");
    const datos = tratamiento[tipo]?.[index];
    if (!datos) return;
    setMedSeleccionado(clave);
    setDias("");
    setDosis(datos.dosis || "");
    setHora(datos.hora || "");
    setModalVisible(true);
    setMensajeExito("");
  };

  const aplicarExtension = async () => {
    if (!medSeleccionado || !dias || !dosis || !hora) return;
    setGuardando(true);

    const [tipo, index] = medSeleccionado.split("-");
    const datos = tratamiento[tipo]?.[index];
    if (!datos) return;

    const fechaInicio = parseFecha(tratamiento.fechaInicio);
    const existentes = notificaciones.filter(
      (n) =>
        n.tipo === "primaria" &&
        typeof n.medicamento === "string" &&
        n.medicamento.trim().toLowerCase() === datos.medicamento.trim().toLowerCase()
    );

    const nuevas = [];
    for (let i = 0; i < parseInt(dias); i++) {
      const offset = existentes.length + i;
      const base = new Date(fechaInicio);
      base.setDate(base.getDate() + offset);
      const [h, m] = hora.split(":".map(Number));
      base.setHours(h, m, 0, 0);

      const fechaP = new Date(base);
      const fechaS = new Date(base.getTime() - 10 * 60000);
      const fechaT = new Date(base.getTime() - 30 * 60000);
      const med = datos.medicamento;

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
      descripcion: `${datos.medicamento.toUpperCase()}: +${dias} días | Hora: ${hora} | Dosis: ${dosis}`,
      fecha: serverTimestamp(),
      autor: "Profesional"
    });

    setGuardando(false);
    setMensajeExito("Extensión aplicada y notificaciones generadas ✔");
  };

  const parseFecha = (f) => (f?.toDate ? f.toDate() : new Date(f));
  const esActivo = idTratamiento === "activo";
  const tiposMedicamento = Object.keys(tratamiento || {}).filter((key) => {
  const val = tratamiento[key];
  return typeof val === "object" && val !== null && (val.medicamento || Array.isArray(val));
});


  const toggleAccordion = (key) => setMedsAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));
  const renderEstado = (confirmada) => (
    <span className="estado-confirmacion">
      {confirmada ? <CheckCircle size={16} color="#4caf50" /> : <XCircle size={16} color="#e53935" />}
      {confirmada ? " Confirmada" : " Sin confirmar"}
    </span>
  );

  const guardarEstudio = async () => {
  if (!nuevoTipoEstudio || !nuevaFechaEstudio) return;

  const data = {
    tipoEstudio: nuevoTipoEstudio,
    fecha: Timestamp.fromDate(new Date(nuevaFechaEstudio)),
  };

  if (nuevoTipoEstudio === "Análisis") {
    data.progesterona = progesterona;
    data.estradiol = estradiol;
    data.lh = lh;
  }

  if (nuevoTipoEstudio === "Ecografía") {
    data.ovarioIzquierdo = izquierdo;
    data.ovarioDerecho = derecho;
    data.foliculos = foliculos;
  }

  await addDoc(collection(db, "usuarios", idUsuario, "tratamientos", idTratamiento, "estudios"), data);

  // Reset
  setModalAgregarEstudio(false);
  setNuevoTipoEstudio("");
  setNuevaFechaEstudio("");
  setProgesterona(""); setEstradiol(""); setLh("");
  setIzquierdo(""); setDerecho(""); setFoliculos("");

  cargarEstudios();
};


  return (
    <div className="detalle-tratamiento">
      <button className="volver" onClick={() => navigate("/tratamientos")}><ArrowLeft size={18} /> Volver</button>
      <h2>Detalle del Tratamiento</h2>
      <p><strong>Tipo:</strong> {tratamiento?.tipo}</p>
      <p><strong>Inicio:</strong> {parseFecha(tratamiento?.fechaInicio).toLocaleDateString()}</p>
      <p><strong>Estado:</strong> {esActivo ? "Activo" : "Finalizado"}</p>

      <h3>Medicamentos</h3>

      {esActivo && (
        <button className="btn-agregar-medicamento" onClick={() => setModalAgregarVisible(true)}>
          <Plus size={16} /> Agregar nuevo medicamento
        </button>
      )}

      {tiposMedicamento.flatMap((tipo) => {
  const datosArray = tratamiento?.[tipo];
  if (!datosArray) return [];

  const normalizado = Array.isArray(datosArray) ? datosArray : [datosArray];

  return normalizado
    .filter((datos) => datos && typeof datos.medicamento === "string")
    .map((datos, index) => {
      const nombre = datos.medicamento;
      const key = `${tipo}-${index}`;
      const eventos = notificaciones.filter(
        (n) =>
          typeof n.medicamento === "string" &&
          typeof nombre === "string" &&
          n.tipo === "primaria" &&
          n.medicamento.toLowerCase() === nombre.toLowerCase()
      );

      return (
        <div key={key} className="acordeon">
          <div className="acordeon-header" onClick={() => toggleAccordion(key)}>
            <div className="info">
              <strong>{tipo.toUpperCase()}</strong> – {nombre} – {eventos.length} días
            </div>
            <div className="acciones">
              {medsAbiertos[key] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
          {medsAbiertos[key] && (
            <div className="acordeon-body">
              <p><strong>Dosis:</strong> {datos.dosis}</p>
              <p><strong>Hora:</strong> {datos.hora}</p>
              <ul>
                {eventos.sort((a, b) => a.fecha.seconds - b.fecha.seconds).map((ev, i) => (
                  <li key={i}>
                    {new Date(ev.fecha.seconds * 1000).toLocaleDateString()} – {renderEstado(ev.confirmada)}
                  </li>
                ))}
              </ul>
              {esActivo && (
                <button className="btn-extender" onClick={() => abrirModal(`${tipo}-${index}`)}>Extender</button>
              )}
            </div>
          )}
        </div>
      );
    });
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

      {modalAgregarVisible && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button className="cerrar" onClick={() => setModalAgregarVisible(false)}><X size={20} /></button>
            <h4>Agregar nuevo medicamento</h4>

            <label>Tipo:
              <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}>
                <option value="">Seleccionar</option>
                <option value="fsh">FSH</option>
                <option value="hmg">HMG</option>
                <option value="antagonista">Antagonista</option>
                <option value="viaOral">Vía Oral</option>
              </select>
            </label>

            {nuevoTipo && (
              <label>Nombre comercial:
                <select value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}>
                  <option value="">Seleccionar</option>
                  {nuevoTipo === "fsh" && ["Elonva", "Gonal", "Folitime", "Puregon", "Rekovelle"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {nuevoTipo === "hmg" && ["Menopur", "Pergoveris", "Life Cell"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {nuevoTipo === "antagonista" && ["Cetrotide", "Orgalutran"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {nuevoTipo === "viaOral" && ["Clomifeno", "Letrozol"].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
            )}

            <label>Dosis:<input type="text" value={nuevoDosis} onChange={(e) => setNuevoDosis(e.target.value)} /></label>
            <label>Hora:<input type="time" value={nuevoHora} onChange={(e) => setNuevoHora(e.target.value)} /></label>
            <label>Días de aplicación:<input type="number" min="1" value={nuevoDias} onChange={(e) => setNuevoDias(e.target.value)} /></label>

            {mensajeNuevoExito && <p className="mensaje-exito">{mensajeNuevoExito}</p>}

              <button
                className="aplicar"
                disabled={guardandoNuevo || mensajeNuevoExito}
                onClick={confirmarNuevoMedicamento}
              >
                <Plus size={16} /> Confirmar
              </button>

          </div>
        </div>
      )}

<h3>Estudios clínicos</h3>

{esActivo && (
  <button className="btn-agregar-medicamento" onClick={() => setModalAgregarEstudio(true)}>
    <Plus size={16} /> Agregar estudio
  </button>
)}


<div className="estudios-grid">
  {estudios.map((est) => (
    <div key={est.id} className="card-estudio">
      <h4>{est.tipoEstudio === "Ecografía" ? "Ecografía" : "Análisis"}</h4>
      <p>Fecha: {parseFecha(est.fecha).toLocaleDateString()}</p>
      <ul>
        {est.tipoEstudio === "Ecografía" && (
          <>
            <li>Ovario Izquierdo: {est.ovarioIzquierdo ?? "-"}</li>
            <li>Ovario Derecho: {est.ovarioDerecho ?? "-"}</li>
            <li>Folículos: {est.foliculos ?? "-"}</li>
          </>
        )}
        {est.tipoEstudio === "Análisis" && (
          <>
            <li>Progesterona: {est.progesterona ?? "-"}</li>
            <li>Estradiol: {est.estradiol ?? "-"}</li>
            <li>LH: {est.lh ?? "-"}</li>
          </>
        )}
      </ul>
    </div>
  ))}
</div>

{modalAgregarEstudio && (
  <div className="modal-extension">
    <div className="modal-contenido">
      <button className="cerrar" onClick={() => setModalAgregarEstudio(false)}><X size={20} /></button>
      <h4>Cargar nuevo estudio</h4>

      <label>Tipo de estudio:
        <select value={nuevoTipoEstudio} onChange={(e) => setNuevoTipoEstudio(e.target.value)}>
          <option value="">Seleccionar</option>
          <option value="Análisis">Análisis</option>
          <option value="Ecografía">Ecografía</option>
        </select>
      </label>

      <label>Fecha:
        <input type="date" value={nuevaFechaEstudio} onChange={(e) => setNuevaFechaEstudio(e.target.value)} />
      </label>

      {nuevoTipoEstudio === "Análisis" && (
        <>
          <label>Progesterona:<input type="number" onChange={(e) => setProgesterona(e.target.value)} /></label>
          <label>Estradiol:<input type="number" onChange={(e) => setEstradiol(e.target.value)} /></label>
          <label>LH:<input type="number" onChange={(e) => setLh(e.target.value)} /></label>
        </>
      )}

      {nuevoTipoEstudio === "Ecografía" && (
        <>
          <label>Ovario Izquierdo:<input type="number" onChange={(e) => setIzquierdo(e.target.value)} /></label>
          <label>Ovario Derecho:<input type="number" onChange={(e) => setDerecho(e.target.value)} /></label>
          <label>Folículos:<input type="number" onChange={(e) => setFoliculos(e.target.value)} /></label>
        </>
      )}

      <button className="aplicar" onClick={guardarEstudio}>
        <Plus size={16} /> Guardar estudio
      </button>
    </div>
  </div>
)}


    </div>
  );
};

export default DetalleTratamiento;
