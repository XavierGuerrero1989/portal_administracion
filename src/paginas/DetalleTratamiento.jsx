// DetalleTratamiento.jsx

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
  deleteDoc,
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
  Trash,
} from "lucide-react";

// Opciones de diagnóstico para el desplegable
const OPCIONES_DIAGNOSTICO = [
  "Sin especificar",
  "Factor ovárico",
  "Factor tubario",
  "Endometriosis",
  "Factor masculino",
  "Infertilidad inexplicada",
  "Baja reserva ovárica",
  "Anovulación crónica",
  "Preservación de fertilidad",
];

// Etiquetas más legibles para tipos de medicamento
const getLabelTipoMedicamento = (key) => {
  switch (key) {
    case "fsh":
      return "FSH";
    case "hmg":
      return "HMG";
    case "antagonista":
      return "Antagonista";
    case "viaOral":
      return "Vía oral";
    case "medicamentosPlanificados":
      return "Medicamentos planificados";
    default:
      return key.toUpperCase();
  }
};

// === Helper para crear NOTIFICACIONES con el FORMATO VIEJO ===
const crearNotificacionFormatoViejo = (
  fechaJs,
  nivel,
  medicamento,
  dosis,
  diaTratamiento,
  tratamientoId
) => ({
  createdAt: serverTimestamp(),
  diaTratamiento,
  dosis,
  estado: "pendiente",
  fechaHoraProgramada: Timestamp.fromDate(fechaJs),
  medicamento,
  nivel, // "primaria" | "secundaria" | "terciaria"
  tipo: "medicacion",
  tratamientoId,
});

const DetalleTratamiento = () => {
  const { idUsuario, idTratamiento } = useParams();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);
  const [tratamiento, setTratamiento] = useState(null);

  // Extender medicamento
  const [modalVisible, setModalVisible] = useState(false);
  const [medSeleccionado, setMedSeleccionado] = useState("");
  const [dias, setDias] = useState("");
  const [hora, setHora] = useState("");
  const [dosis, setDosis] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState("");

  const [notificaciones, setNotificaciones] = useState([]);
  const [medsAbiertos, setMedsAbiertos] = useState({});

  // Agregar nuevo medicamento
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDosis, setNuevoDosis] = useState("");
  const [nuevoHora, setNuevoHora] = useState("");
  const [nuevoDias, setNuevoDias] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [mensajeNuevoExito, setMensajeNuevoExito] = useState("");

  // Estudios clínicos
  const [estudios, setEstudios] = useState([]);
  const [modalAgregarEstudio, setModalAgregarEstudio] = useState(false);
  const [nuevoTipoEstudio, setNuevoTipoEstudio] = useState("");
  const [subtipoEstudio, setSubtipoEstudio] = useState("");
  const [nuevaFechaEstudio, setNuevaFechaEstudio] = useState("");
  const [progesterona, setProgesterona] = useState("");
  const [estradiol, setEstradiol] = useState("");
  const [lh, setLh] = useState("");
  const [fsh, setFsh] = useState("");
  const [ham, setHam] = useState("");
  const [izquierdo, setIzquierdo] = useState("");
  const [derecho, setDerecho] = useState("");
  const [foliculos, setFoliculos] = useState("");
  const [comentariosEstudio, setComentariosEstudio] = useState("");

  // Modal diagnóstico
  const [modalDiagnosticoVisible, setModalDiagnosticoVisible] =
    useState(false);
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState("");

  const esActivo = idTratamiento === "activo";

  // Helpers
  const parseFecha = (f) => {
    if (!f) return null;
    if (typeof f.toDate === "function") return f.toDate();
    if (f.seconds) return new Date(f.seconds * 1000);
    const d = new Date(f);
    return isNaN(d.getTime()) ? null : d;
  };

  const calcularEdad = (fechaNac) => {
    const f = parseFecha(fechaNac);
    if (!f) return "-";
    const hoy = new Date();
    let edad = hoy.getFullYear() - f.getFullYear();
    const mes = hoy.getMonth() - f.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < f.getDate())) edad--;
    if (isNaN(edad)) return "-";
    return `${edad} años`;
  };

  const getFechaNotificacion = (n) => {
    const origen = n?.fecha || n?.fechaHoraProgramada;
    const d = parseFecha(origen);
    return d ? d.toLocaleDateString() : "-";
  };

  // Carga datos paciente + tratamiento + notificaciones
  const cargarDatos = async () => {
    if (!idUsuario || !idTratamiento) return;

    const usuarioRef = doc(db, "usuarios", idUsuario);
    const usuarioSnap = await getDoc(usuarioRef);
    if (usuarioSnap.exists()) {
      setPaciente(usuarioSnap.data());
    }

    const tratRef = doc(
      db,
      "usuarios",
      idUsuario,
      "tratamientos",
      idTratamiento
    );
    const tratSnap = await getDoc(tratRef);
    if (tratSnap.exists()) {
      setTratamiento(tratSnap.data());
    }

    const notisSnap = await getDocs(
      collection(db, "usuarios", idUsuario, "notificaciones")
    );
    const todas = notisSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setNotificaciones(todas);
  };

  // Carga estudios
  const cargarEstudios = async () => {
    const ref = collection(
      db,
      "usuarios",
      idUsuario,
      "tratamientos",
      idTratamiento,
      "estudios"
    );
    const snap = await getDocs(ref);
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setEstudios(
      lista.sort(
        (a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0)
      )
    );
  };

  const eliminarEstudio = async (id) => {
    const ref = doc(
      db,
      "usuarios",
      idUsuario,
      "tratamientos",
      idTratamiento,
      "estudios",
      id
    );
    await deleteDoc(ref);
    await cargarEstudios();
  };

  useEffect(() => {
    cargarDatos();
    cargarEstudios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario, idTratamiento]);

  // Tipos de medicamento definidos en el tratamiento
  const tiposMedicamento = tratamiento
    ? Object.keys(tratamiento).filter((key) => {
        if (["tipo", "fechaInicio", "estado", "diagnostico"].includes(key))
          return false;
        const val = tratamiento[key];
        return (
          val &&
          typeof val === "object" &&
          (Array.isArray(val) || val.medicamento || val.nombre)
        );
      })
    : [];

  // Acordeón
  const toggleAccordion = (key) =>
    setMedsAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderEstado = (confirmada) => (
    <span className="estado-confirmacion">
      {confirmada ? (
        <>
          <CheckCircle size={16} color="#4caf50" />
          <span> Confirmada</span>
        </>
      ) : (
        <>
          <XCircle size={16} color="#e53935" />
          <span> Sin confirmar</span>
        </>
      )}
    </span>
  );

  // Abrir modal para extender medicamento
  const abrirModal = (clave) => {
    if (!tratamiento) return;
    const [tipo, indexStr] = clave.split("-");
    const index = parseInt(indexStr, 10);
    const fuente = tratamiento[tipo];
    const arreglo = Array.isArray(fuente) ? fuente : [fuente];
    const datos = arreglo[index];
    if (!datos) return;

    const dosisMed =
      datos.dosis || datos.dosisDiaria || datos.dosisMg || datos.dosisUi || "";
    const horaMed =
      datos.horaAplicacion ||
      datos.hora ||
      datos.horario ||
      datos.horaMedicamento ||
      "";

    setMedSeleccionado(clave);
    setDias("");
    setDosis(dosisMed);
    setHora(horaMed);
    setModalVisible(true);
    setMensajeExito("");
  };

  // Aplicar extensión (crea NOTIS FORMATO VIEJO)
  const aplicarExtension = async () => {
    if (!medSeleccionado || !dias || !dosis || !hora || !tratamiento) return;
    setGuardando(true);

    const [tipo, indexStr] = medSeleccionado.split("-");
    const index = parseInt(indexStr, 10);
    const fuente = tratamiento[tipo];
    const arreglo = Array.isArray(fuente) ? fuente : [fuente];
    const datos = arreglo[index];
    if (!datos) {
      setGuardando(false);
      return;
    }

    const fechaInicio = parseFecha(tratamiento.fechaInicio);
    if (!fechaInicio) {
      setGuardando(false);
      return;
    }

    const nombreMed =
      datos.nombre || datos.medicamento || datos.nombreComercial || "";

    // diaTratamiento base = máximo existente en NOTIFICACIONES
    const maxDia = notificaciones.reduce(
      (acc, n) => Math.max(acc, n.diaTratamiento || 0),
      0
    );

    const nuevas = [];

    for (let i = 0; i < parseInt(dias, 10); i++) {
      const diaTratamiento = maxDia + i + 1;

      const base = new Date(fechaInicio);
      // día 1 = fechaInicio
      base.setDate(base.getDate() + (diaTratamiento - 1));
      const [h, m] = hora.split(":").map(Number);
      base.setHours(h, m, 0, 0);

      const fechaP = new Date(base);
      const fechaS = new Date(base.getTime() - 10 * 60000);
      const fechaT = new Date(base.getTime() - 30 * 60000);

      nuevas.push(
        crearNotificacionFormatoViejo(
          fechaP,
          "primaria",
          nombreMed,
          dosis,
          diaTratamiento,
          idTratamiento
        ),
        crearNotificacionFormatoViejo(
          fechaS,
          "secundaria",
          nombreMed,
          dosis,
          diaTratamiento,
          idTratamiento
        ),
        crearNotificacionFormatoViejo(
          fechaT,
          "terciaria",
          nombreMed,
          dosis,
          diaTratamiento,
          idTratamiento
        )
      );
    }

    const ref = collection(db, "usuarios", idUsuario, "notificaciones");
    await Promise.all(nuevas.map((n) => addDoc(ref, n)));

    await addDoc(collection(db, "usuarios", idUsuario, "historial"), {
      tipo: "modificacion",
      titulo: "Extensión del tratamiento",
      descripcion: `${nombreMed.toUpperCase()}: +${dias} días | Hora: ${hora} | Dosis: ${dosis}`,
      fecha: serverTimestamp(),
      autor: "Profesional",
    });

    setGuardando(false);
    setMensajeExito("Extensión aplicada y notificaciones generadas ✔");
  };

  // Crear nuevo medicamento (usa duracionDias y notificaciones formato viejo)
  const confirmarNuevoMedicamento = async () => {
    if (!nuevoTipo || !nuevoNombre || !nuevoDosis || !nuevoHora || !nuevoDias)
      return;
    if (!tratamiento) return;

    setGuardandoNuevo(true);
    setMensajeNuevoExito("");

    const nuevaData = {
      nombre: nuevoNombre,
      dosis: nuevoDosis,
      horaAplicacion: nuevoHora,
      duracionDias: parseInt(nuevoDias, 10),
      fum: new Date().toISOString(),
    };

    const tratamientoRef = doc(
      db,
      "usuarios",
      idUsuario,
      "tratamientos",
      idTratamiento
    );
    const tipoActual = tratamiento[nuevoTipo];

    if (!tipoActual) {
      await updateDoc(tratamientoRef, {
        [nuevoTipo]: [nuevaData],
      });
    } else if (Array.isArray(tipoActual)) {
      await updateDoc(tratamientoRef, {
        [nuevoTipo]: arrayUnion(nuevaData),
      });
    } else {
      await updateDoc(tratamientoRef, {
        [nuevoTipo]: [tipoActual, nuevaData],
      });
    }

    const fechaInicio = parseFecha(tratamiento.fechaInicio);
    if (!fechaInicio) {
      setGuardandoNuevo(false);
      return;
    }

    // Cantidad total de días ya usados en el tratamiento (todos los meds)
    const maxDia = notificaciones.reduce(
      (acc, n) => Math.max(acc, n.diaTratamiento || 0),
      0
    );

    const nuevasNotis = [];
    const diasInt = parseInt(nuevoDias, 10);

    for (let i = 0; i < diasInt; i++) {
      const diaTratamiento = maxDia + i + 1;

      const base = new Date(fechaInicio);
      base.setDate(base.getDate() + (diaTratamiento - 1));
      const [h, m] = nuevoHora.split(":").map(Number);
      base.setHours(h, m, 0, 0);

      const fechaP = new Date(base);
      const fechaS = new Date(base.getTime() - 10 * 60000);
      const fechaT = new Date(base.getTime() - 30 * 60000);

      nuevasNotis.push(
        crearNotificacionFormatoViejo(
          fechaP,
          "primaria",
          nuevoNombre,
          nuevoDosis,
          diaTratamiento,
          idTratamiento
        ),
        crearNotificacionFormatoViejo(
          fechaS,
          "secundaria",
          nuevoNombre,
          nuevoDosis,
          diaTratamiento,
          idTratamiento
        ),
        crearNotificacionFormatoViejo(
          fechaT,
          "terciaria",
          nuevoNombre,
          nuevoDosis,
          diaTratamiento,
          idTratamiento
        )
      );
    }

    const notisRef = collection(db, "usuarios", idUsuario, "notificaciones");
    await Promise.all(nuevasNotis.map((n) => addDoc(notisRef, n)));

    await addDoc(collection(db, "usuarios", idUsuario, "historial"), {
      tipo: "agregado",
      titulo: "Nuevo medicamento agregado",
      descripcion: `${nuevoTipo.toUpperCase()} - ${nuevoNombre} – Dosis: ${nuevoDosis} – Hora: ${nuevoHora} – Días: ${nuevoDias}`,
      fecha: serverTimestamp(),
      autor: "Profesional",
    });

    await cargarDatos();
    setGuardandoNuevo(false);
    setMensajeNuevoExito("✔ Medicamento agregado correctamente");

    setTimeout(() => {
      setModalAgregarVisible(false);
      setNuevoTipo("");
      setNuevoNombre("");
      setNuevoDosis("");
      setNuevoHora("");
      setNuevoDias("");
      setMensajeNuevoExito("");
    }, 1500);
  };

  const numOrNull = (v) => {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const guardarEstudio = async () => {
    if (!nuevoTipoEstudio || !nuevaFechaEstudio) return;

    const data = {
      tipoEstudio: nuevoTipoEstudio,
      fecha: Timestamp.fromDate(new Date(nuevaFechaEstudio)),
      subtipo: subtipoEstudio || null,
      comentarios: comentariosEstudio || "",
      creadoPor: "medico",
      creadoEn: serverTimestamp(),
    };

    if (nuevoTipoEstudio === "Análisis") {
      data.progesterona = numOrNull(progesterona);
      data.estradiol = numOrNull(estradiol);
      data.lh = numOrNull(lh);
      data.fsh = numOrNull(fsh);
      data.ham = numOrNull(ham);
    }

    if (nuevoTipoEstudio === "Ecografía") {
      data.ovarioIzquierdo = numOrNull(izquierdo);
      data.ovarioDerecho = numOrNull(derecho);
      data.foliculos = numOrNull(foliculos);
    }

    await addDoc(
      collection(
        db,
        "usuarios",
        idUsuario,
        "tratamientos",
        idTratamiento,
        "estudios"
      ),
      data
    );

    setModalAgregarEstudio(false);
    setNuevoTipoEstudio("");
    setSubtipoEstudio("");
    setNuevaFechaEstudio("");
    setProgesterona("");
    setEstradiol("");
    setLh("");
    setFsh("");
    setHam("");
    setIzquierdo("");
    setDerecho("");
    setFoliculos("");
    setComentariosEstudio("");

    cargarEstudios();
  };

  const guardarDiagnostico = async () => {
    if (!diagnosticoSeleccionado) return;

    const tratamientoRef = doc(
      db,
      "usuarios",
      idUsuario,
      "tratamientos",
      idTratamiento
    );
    const usuarioRef = doc(db, "usuarios", idUsuario);

    await updateDoc(tratamientoRef, {
      diagnostico: diagnosticoSeleccionado,
    });

    await updateDoc(usuarioRef, {
      diagnosticoPrincipal: diagnosticoSeleccionado,
    });

    setTratamiento((prev) =>
      prev ? { ...prev, diagnostico: diagnosticoSeleccionado } : prev
    );
    setPaciente((prev) =>
      prev ? { ...prev, diagnosticoPrincipal: diagnosticoSeleccionado } : prev
    );

    setModalDiagnosticoVisible(false);
  };

  return (
    <div className="detalle-tratamiento">
      <button className="volver" onClick={() => navigate("/tratamientos")}>
        <ArrowLeft size={18} /> Volver
      </button>

      <h2>Detalle del Tratamiento</h2>

      {/* Cabecera con paciente + tratamiento */}
      <div className="cabecera-tratamiento">
        <div className="info-paciente">
          <p>
            <strong>Paciente:</strong>{" "}
            {paciente
              ? `${paciente.nombre || ""} ${paciente.apellido || ""}`.trim() ||
                "-"
              : "-"}
          </p>
          <p>
            <strong>Edad:</strong>{" "}
            {paciente ? calcularEdad(paciente.fechaNacimiento) : "-"}
          </p>
        </div>
        <div className="info-tratamiento">
          <p>
            <strong>Tipo de tratamiento:</strong> {tratamiento?.tipo || "-"}
          </p>
          <p>
            <strong>Inicio:</strong>{" "}
            {tratamiento?.fechaInicio
              ? parseFecha(tratamiento.fechaInicio)?.toLocaleDateString() ||
                "-"
              : "-"}
          </p>
          <p>
            <strong>Estado:</strong> {esActivo ? "Activo" : "Finalizado"}
          </p>
          <p>
            <strong>Diagnóstico:</strong>{" "}
            {tratamiento?.diagnostico ||
              paciente?.diagnosticoPrincipal ||
              paciente?.diagnostico ||
              "-"}
          </p>

          {esActivo && (
            <button
              className="btn-editar-diagnostico"
              onClick={() => {
                const actual =
                  tratamiento?.diagnostico ||
                  paciente?.diagnosticoPrincipal ||
                  paciente?.diagnostico ||
                  "";
                setDiagnosticoSeleccionado(actual);
                setModalDiagnosticoVisible(true);
              }}
            >
              Editar diagnóstico
            </button>
          )}
        </div>
      </div>

      {/* MEDICAMENTOS */}
      <h3>Medicamentos</h3>

      {esActivo && (
        <button
          className="btn-agregar-medicamento"
          onClick={() => setModalAgregarVisible(true)}
        >
          <Plus size={16} /> Agregar nuevo medicamento
        </button>
      )}

      {tiposMedicamento.length === 0 && (
        <p className="texto-vacio">No hay medicamentos registrados.</p>
      )}

      {tiposMedicamento.flatMap((tipo) => {
        const datosArray = tratamiento?.[tipo];
        if (!datosArray) return [];

        const normalizado = Array.isArray(datosArray)
          ? datosArray
          : [datosArray];

        return normalizado
          .filter((datos) => {
            if (!datos || typeof datos !== "object") return false;
            return (
              typeof datos.nombre === "string" ||
              typeof datos.medicamento === "string" ||
              typeof datos.nombreComercial === "string"
            );
          })
          .map((datos, index) => {
            const nombre =
              datos.nombre ||
              datos.medicamento ||
              datos.nombreComercial ||
              "Medicamento";

            const dosisMed =
              datos.dosis ||
              datos.dosisDiaria ||
              datos.dosisMg ||
              datos.dosisUi ||
              "";

            const horaMed =
              datos.horaAplicacion ||
              datos.hora ||
              datos.horario ||
              datos.horaMedicamento ||
              "";

            const diasConfig =
              typeof datos.duracionDias === "number"
                ? datos.duracionDias
                : typeof datos.duracion === "number"
                ? datos.duracion
                : typeof datos.dias === "number"
                ? datos.dias
                : null;

            const key = `${tipo}-${index}`;

            // Eventos: soporta FORMATO VIEJO y cualquier cosa nueva
            const eventos = notificaciones.filter((n) => {
              const medNoti =
                (typeof n.medicamento === "string" && n.medicamento) ||
                (typeof n.nombre === "string" && n.nombre) ||
                (typeof n.nombreMedicamento === "string" &&
                  n.nombreMedicamento) ||
                "";
              if (!medNoti) return false;

              const esPrimaria =
                n.nivel === "primaria" || n.tipo === "primaria";

              return (
                esPrimaria &&
                medNoti.trim().toLowerCase() === nombre.trim().toLowerCase()
              );
            });

            const diasMostrados =
              eventos.length > 0
                ? eventos.length
                : typeof diasConfig === "number"
                ? diasConfig
                : null;

            return (
              <div key={key} className="acordeon">
                <div
                  className="acordeon-header"
                  onClick={() => toggleAccordion(key)}
                >
                  <div className="info">
                    <strong>{getLabelTipoMedicamento(tipo)}</strong> – {nombre}
                    {diasMostrados != null && ` – ${diasMostrados} días`}
                  </div>
                  <div className="acciones">
                    {medsAbiertos[key] ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </div>
                {medsAbiertos[key] && (
                  <div className="acordeon-body">
                    <p>
                      <strong>Dosis:</strong> {dosisMed || "-"}
                    </p>
                    <p>
                      <strong>Hora:</strong> {horaMed || "-"}
                    </p>
                    {diasMostrados != null && (
                      <p>
                        <strong>Días de aplicación:</strong> {diasMostrados}
                      </p>
                    )}

                    <ul>
                      {eventos
                        .slice()
                        .sort(
                          (a, b) =>
                            (a.fecha?.seconds ||
                              a.fechaHoraProgramada?.seconds ||
                              0) -
                            (b.fecha?.seconds ||
                              b.fechaHoraProgramada?.seconds ||
                              0)
                        )
                        .map((ev, i) => (
                          <li key={i}>
                            {getFechaNotificacion(ev)} –{" "}
                            {renderEstado(
                              ev.confirmada ?? ev.estado === "confirmado"
                            )}
                          </li>
                        ))}
                    </ul>

                    {esActivo && (
                      <button
                        className="btn-extender"
                        onClick={() => abrirModal(`${tipo}-${index}`)}
                      >
                        Extender
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          });
      })}

      {/* MODAL EXTENDER MEDICAMENTO */}
      {modalVisible && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button
              className="cerrar"
              onClick={() => setModalVisible(false)}
            >
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
            {mensajeExito && (
              <p className="mensaje-exito">{mensajeExito}</p>
            )}
            <button
              className="aplicar"
              disabled={guardando || !!mensajeExito}
              onClick={aplicarExtension}
            >
              <Plus size={16} /> Aplicar extensión
            </button>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR MEDICAMENTO */}
      {modalAgregarVisible && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button
              className="cerrar"
              onClick={() => setModalAgregarVisible(false)}
            >
              <X size={20} />
            </button>
            <h4>Agregar nuevo medicamento</h4>

            <label>
              Tipo:
              <select
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="fsh">FSH</option>
                <option value="hmg">HMG</option>
                <option value="antagonista">Antagonista</option>
                <option value="viaOral">Vía Oral</option>
              </select>
            </label>

            {nuevoTipo && (
              <label>
                Nombre comercial:
                <select
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {nuevoTipo === "fsh" &&
                    ["Elonva", "Gonal", "Folitime", "Puregon", "Rekovelle"].map(
                      (m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      )
                    )}
                  {nuevoTipo === "hmg" &&
                    ["Menopur", "Pergoveris", "Life Cell"].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  {nuevoTipo === "antagonista" &&
                    ["Cetrotide", "Orgalutran"].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  {nuevoTipo === "viaOral" &&
                    ["Clomifeno", "Letrozol"].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </select>
              </label>
            )}

            <label>
              Dosis:
              <input
                type="text"
                value={nuevoDosis}
                onChange={(e) => setNuevoDosis(e.target.value)}
              />
            </label>
            <label>
              Hora:
              <input
                type="time"
                value={nuevoHora}
                onChange={(e) => setNuevoHora(e.target.value)}
              />
            </label>
            <label>
              Días de aplicación:
              <input
                type="number"
                min="1"
                value={nuevoDias}
                onChange={(e) => setNuevoDias(e.target.value)}
              />
            </label>

            {mensajeNuevoExito && (
              <p className="mensaje-exito">{mensajeNuevoExito}</p>
            )}

            <button
              className="aplicar"
              disabled={guardandoNuevo || !!mensajeNuevoExito}
              onClick={confirmarNuevoMedicamento}
            >
              <Plus size={16} /> Confirmar
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDITAR DIAGNÓSTICO */}
      {modalDiagnosticoVisible && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button
              className="cerrar"
              onClick={() => setModalDiagnosticoVisible(false)}
            >
              <X size={20} />
            </button>
            <h4>Editar diagnóstico</h4>

            <label>
              Diagnóstico:
              <select
                value={diagnosticoSeleccionado}
                onChange={(e) => setDiagnosticoSeleccionado(e.target.value)}
              >
                <option value="">Seleccionar</option>
                {OPCIONES_DIAGNOSTICO.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </label>

            <button className="aplicar" onClick={guardarDiagnostico}>
              <CheckCircle size={16} /> Guardar diagnóstico
            </button>
          </div>
        </div>
      )}

      {/* ESTUDIOS CLÍNICOS */}
      <h3>Estudios clínicos</h3>

      {esActivo && (
        <button
          className="btn-agregar-medicamento"
          onClick={() => setModalAgregarEstudio(true)}
        >
          <Plus size={16} /> Agregar estudio
        </button>
      )}

      {estudios.length === 0 && (
        <p className="texto-vacio">No hay estudios cargados.</p>
      )}

      <div className="estudios-grid">
        {estudios.map((est) => {
          const fecha = parseFecha(est.fecha);
          return (
            <div key={est.id} className="card-estudio">
              <h4>{est.tipoEstudio || "Estudio"}</h4>
              <p>Fecha: {fecha ? fecha.toLocaleDateString() : "-"}</p>
              {est.subtipo && (
                <p className="subtipo">Subtipo: {est.subtipo}</p>
              )}

              <ul>
                {est.tipoEstudio === "Ecografía" && (
                  <>
                    {est.foliculos != null && (
                      <li>Recuento folicular: {est.foliculos}</li>
                    )}
                    {est.ovarioDerecho != null && (
                      <li>Ovario derecho: {est.ovarioDerecho}</li>
                    )}
                    {est.ovarioIzquierdo != null && (
                      <li>Ovario izquierdo: {est.ovarioIzquierdo}</li>
                    )}
                  </>
                )}

                {est.tipoEstudio === "Análisis" && (
                  <>
                    {est.fsh != null && <li>FSH: {est.fsh}</li>}
                    {est.lh != null && <li>LH: {est.lh}</li>}
                    {est.estradiol != null && (
                      <li>Estradiol: {est.estradiol}</li>
                    )}
                    {est.ham != null && <li>HAM: {est.ham}</li>}
                    {est.progesterona != null && (
                      <li>Progesterona: {est.progesterona}</li>
                    )}
                  </>
                )}
              </ul>

              {est.comentarios && (
                <p className="comentarios">Comentarios: {est.comentarios}</p>
              )}

              {esActivo && (
                <button
                  className="btn-eliminar-estudio"
                  onClick={() => eliminarEstudio(est.id)}
                >
                  <Trash size={14} /> Eliminar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL AGREGAR ESTUDIO */}
      {modalAgregarEstudio && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button
              className="cerrar"
              onClick={() => setModalAgregarEstudio(false)}
            >
              <X size={20} />
            </button>
            <h4>Cargar nuevo estudio</h4>

            <label>
              Tipo de estudio:
              <select
                value={nuevoTipoEstudio}
                onChange={(e) => {
                  setNuevoTipoEstudio(e.target.value);
                  setSubtipoEstudio("");
                }}
              >
                <option value="">Seleccionar</option>
                <option value="Análisis">Análisis</option>
                <option value="Ecografía">Ecografía</option>
              </select>
            </label>

            <label>
              Fecha:
              <input
                type="date"
                value={nuevaFechaEstudio}
                onChange={(e) => setNuevaFechaEstudio(e.target.value)}
              />
            </label>

            {nuevoTipoEstudio === "Análisis" && (
              <>
                <label>
                  Subtipo:
                  <select
                    value={subtipoEstudio}
                    onChange={(e) => setSubtipoEstudio(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Previo al estímulo">
                      Previo al estímulo
                    </option>
                    <option value="Laboratorio general">
                      Laboratorio general
                    </option>
                  </select>
                </label>

                <label>
                  FSH:
                  <input
                    type="number"
                    value={fsh}
                    onChange={(e) => setFsh(e.target.value)}
                  />
                </label>
                <label>
                  LH:
                  <input
                    type="number"
                    value={lh}
                    onChange={(e) => setLh(e.target.value)}
                  />
                </label>
                <label>
                  Estradiol:
                  <input
                    type="number"
                    value={estradiol}
                    onChange={(e) => setEstradiol(e.target.value)}
                  />
                </label>
                <label>
                  HAM:
                  <input
                    type="number"
                    value={ham}
                    onChange={(e) => setHam(e.target.value)}
                  />
                </label>
                <label>
                  Progesterona:
                  <input
                    type="number"
                    value={progesterona}
                    onChange={(e) => setProgesterona(e.target.value)}
                  />
                </label>
              </>
            )}

            {nuevoTipoEstudio === "Ecografía" && (
              <>
                <label>
                  Subtipo:
                  <select
                    value={subtipoEstudio}
                    onChange={(e) => setSubtipoEstudio(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    <option value="Basal">Basal</option>
                    <option value="En estimulación">En estimulación</option>
                  </select>
                </label>

                <label>
                  Ovario izquierdo:
                  <input
                    type="number"
                    value={izquierdo}
                    onChange={(e) => setIzquierdo(e.target.value)}
                  />
                </label>
                <label>
                  Ovario derecho:
                  <input
                    type="number"
                    value={derecho}
                    onChange={(e) => setDerecho(e.target.value)}
                  />
                </label>
                <label>
                  Recuento folicular:
                  <input
                    type="number"
                    value={foliculos}
                    onChange={(e) => setFoliculos(e.target.value)}
                  />
                </label>
              </>
            )}

            <label>
              Comentarios:
              <textarea
                rows={3}
                value={comentariosEstudio}
                onChange={(e) => setComentariosEstudio(e.target.value)}
              />
            </label>

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
