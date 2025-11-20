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
  query,
  where,
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

// Tipos de finalización de tratamiento
const TIPOS_FINALIZACION = [
  { value: "puncion", label: "Punción" },
  { value: "cancelacion_estimulo", label: "Cancelación de estímulo" },
];

// Motivos de cancelación del estímulo
const MOTIVOS_CANCELACION = [
  {
    value: "error_paciente",
    label: "Error de la paciente (omisión / aplicación incorrecta)",
  },
  {
    value: "enfermedad_intercurrente",
    label: "Enfermedad intercurrente",
  },
  {
    value: "mala_respuesta_ovarica",
    label: "Mala respuesta ovárica",
  },
  {
    value: "decision_compartida",
    label: "Decisión paciente / equipo médico",
  },
  {
    value: "otro",
    label: "Otro motivo",
  },
];

const getLabelMotivoCancelacion = (value) => {
  const found = MOTIVOS_CANCELACION.find((m) => m.value === value);
  return found ? found.label : value;
};

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
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDosis, setNuevoDosis] = useState("");
  const [nuevoHora, setNuevoHora] = useState("");
  const [nuevoDias, setNuevoDias] = useState("");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [mensajeNuevoExito, setMensajeNuevoExito] = useState("");

  // Estudios clínicos (ahora vienen del campo estudiosClinicos del tratamiento)
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
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] =
    useState("");

  // Suspender medicamento
  const [modalSuspenderVisible, setModalSuspenderVisible] = useState(false);
  const [medSuspenderClave, setMedSuspenderClave] = useState("");
  const [fechaSuspension, setFechaSuspension] = useState("");

  // Finalizar tratamiento
  const [modalFinalizarVisible, setModalFinalizarVisible] = useState(false);
  const [tipoFinalizacion, setTipoFinalizacion] = useState("");
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [comentarioFinalizacion, setComentarioFinalizacion] = useState("");
  const [guardandoFinalizacion, setGuardandoFinalizacion] = useState(false);

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
      const dataTrat = tratSnap.data();
      setTratamiento(dataTrat);

      // 🔥 Levantamos estudiosClinicos desde el tratamiento y los ordenamos
      const lista = Array.isArray(dataTrat.estudiosClinicos)
        ? [...dataTrat.estudiosClinicos]
        : [];

      lista.sort((a, b) => {
        const fa = parseFecha(a.fecha)?.getTime() || 0;
        const fb = parseFecha(b.fecha)?.getTime() || 0;
        return fb - fa; // más recientes primero
      });

      setEstudios(lista);
    }

    const notisSnap = await getDocs(
      collection(db, "usuarios", idUsuario, "notificaciones")
    );
    const todas = notisSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setNotificaciones(todas);
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idUsuario, idTratamiento]);

  // Tipos de medicamento definidos en el tratamiento:
  // ahora solo usamos "medicamentosPlanificados"
  const tiposMedicamento = tratamiento?.medicamentosPlanificados
    ? ["medicamentosPlanificados"]
    : [];

  // Estado del tratamiento:
  // - Solo puede estar activo si el idTratamiento es "activo" y no tiene estado "finalizado".
  const esFinalizado =
    tratamiento?.estado === "finalizado" || idTratamiento !== "activo";
  const esActivo = !esFinalizado;

  // Acordeón
  const toggleAccordion = (key) =>
    setMedsAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderEstado = (confirmada, estado) => {
    if (estado === "cancelada" || estado === "cancelada_por_finalizacion") {
      return (
        <span className="estado-confirmacion" style={{ color: "#c62828" }}>
          <XCircle size={16} />
          <span>
            {" "}
            {estado === "cancelada_por_finalizacion"
              ? "Cancelada por finalización"
              : "Cancelada"}
          </span>
        </span>
      );
    }

    return (
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
  };

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

  // Abrir modal para suspender medicamento
  const abrirModalSuspender = (clave) => {
    setMedSuspenderClave(clave);
    const hoy = new Date().toISOString().slice(0, 10);
    setFechaSuspension(hoy);
    setModalSuspenderVisible(true);
  };

  // Abrir modal para finalizar tratamiento
  const abrirModalFinalizar = () => {
    setTipoFinalizacion("");
    setMotivoCancelacion("");
    setComentarioFinalizacion("");
    setModalFinalizarVisible(true);
  };

  const cerrarModalFinalizar = () => {
    if (guardandoFinalizacion) return;
    setModalFinalizarVisible(false);
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

  // Crear nuevo medicamento (solo medicamentosPlanificados)
  const confirmarNuevoMedicamento = async () => {
    if (!nuevoNombre || !nuevoDosis || !nuevoHora || !nuevoDias) return;
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

    const actual = tratamiento.medicamentosPlanificados;

    if (!actual) {
      await updateDoc(tratamientoRef, {
        medicamentosPlanificados: [nuevaData],
      });
    } else {
      await updateDoc(tratamientoRef, {
        medicamentosPlanificados: arrayUnion(nuevaData),
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
          diaTratamiento
        )
      );
    }

    const notisRef = collection(db, "usuarios", idUsuario, "notificaciones");
    await Promise.all(nuevasNotis.map((n) => addDoc(notisRef, n)));

    await addDoc(collection(db, "usuarios", idUsuario, "historial"), {
      tipo: "agregado",
      titulo: "Nuevo medicamento agregado",
      descripcion: `${nuevoNombre} – Dosis: ${nuevoDosis} – Hora: ${nuevoHora} – Días: ${nuevoDias}`,
      fecha: serverTimestamp(),
      autor: "Profesional",
    });

    await cargarDatos();
    setGuardandoNuevo(false);
    setMensajeNuevoExito("✔ Medicamento agregado correctamente");

    setTimeout(() => {
      setModalAgregarVisible(false);
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

  // 🔥 Guardar estudio DENTRO del tratamiento (campo estudiosClinicos)
  const guardarEstudio = async () => {
    if (!nuevoTipoEstudio || !nuevaFechaEstudio) return;
    if (!tratamiento) return;

    const data = {
      tipoEstudio: nuevoTipoEstudio,
      fecha: new Date(nuevaFechaEstudio),
      subtipo: subtipoEstudio || null,
      comentarios: comentariosEstudio || "",
      creadoPor: "medico",
      creadoEn: new Date(),
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

    try {
      const tratamientoRef = doc(
        db,
        "usuarios",
        idUsuario,
        "tratamientos",
        idTratamiento
      );

      const listaActual = Array.isArray(tratamiento.estudiosClinicos)
        ? tratamiento.estudiosClinicos
        : [];

      const nuevaLista = [...listaActual, data];

      await updateDoc(tratamientoRef, {
        estudiosClinicos: nuevaLista,
      });

      // ordenamos por fecha (más reciente primero)
      const ordenada = [...nuevaLista].sort((a, b) => {
        const fa = parseFecha(a.fecha)?.getTime() || 0;
        const fb = parseFecha(b.fecha)?.getTime() || 0;
        return fb - fa;
      });

      setEstudios(ordenada);
      setTratamiento((prev) =>
        prev ? { ...prev, estudiosClinicos: nuevaLista } : prev
      );

      // Limpiar modal
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
    } catch (e) {
      console.error("Error al guardar estudio:", e);
      alert("Hubo un problema al guardar el estudio.");
    }
  };

  // 🔥 Eliminar estudio desde el array estudiosClinicos
  const eliminarEstudio = async (index) => {
    if (!tratamiento) return;

    try {
      const tratamientoRef = doc(
        db,
        "usuarios",
        idUsuario,
        "tratamientos",
        idTratamiento
      );

      const actual = Array.isArray(tratamiento.estudiosClinicos)
        ? tratamiento.estudiosClinicos
        : [];

      const nuevaLista = actual.filter((_, i) => i !== index);

      await updateDoc(tratamientoRef, {
        estudiosClinicos: nuevaLista,
      });

      const ordenada = [...nuevaLista].sort((a, b) => {
        const fa = parseFecha(a.fecha)?.getTime() || 0;
        const fb = parseFecha(b.fecha)?.getTime() || 0;
        return fb - fa;
      });

      setEstudios(ordenada);
      setTratamiento((prev) =>
        prev ? { ...prev, estudiosClinicos: nuevaLista } : prev
      );
    } catch (e) {
      console.error("Error al eliminar estudio:", e);
      alert("No se pudo eliminar el estudio.");
    }
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

  const confirmarSuspensionMedicamento = async () => {
    if (!medSuspenderClave || !fechaSuspension || !tratamiento) return;

    const [tipo, indexStr] = medSuspenderClave.split("-");
    const index = parseInt(indexStr, 10);

    const fuente = tratamiento[tipo];
    if (!fuente) return;

    const arreglo = Array.isArray(fuente) ? [...fuente] : [fuente];
    const datos = arreglo[index];
    if (!datos) return;

    const fechaSusp = Timestamp.fromDate(new Date(fechaSuspension));

    const actualizado = {
      ...datos,
      suspendidoEn: fechaSusp,
    };

    arreglo[index] = actualizado;

    const tratamientoRef = doc(
      db,
      "usuarios",
      idUsuario,
      "tratamientos",
      idTratamiento
    );

    await updateDoc(tratamientoRef, {
      [tipo]: Array.isArray(fuente) ? arreglo : actualizado,
    });

    const nombreMed =
      datos.nombre || datos.medicamento || datos.nombreComercial || "Medicamento";

    // 👉 Cancelar notificaciones futuras de este medicamento
    const fechaSuspDate = new Date(fechaSuspension);
    fechaSuspDate.setHours(0, 0, 0, 0);

    const futuras = notificaciones.filter((n) => {
      const medNoti =
        (typeof n.medicamento === "string" && n.medicamento) ||
        (typeof n.nombre === "string" && n.nombre) ||
        (typeof n.nombreMedicamento === "string" && n.nombreMedicamento) ||
        "";
      if (!medNoti) return false;

      if (medNoti.trim().toLowerCase() !== nombreMed.trim().toLowerCase()) {
        return false;
      }

      const d = parseFecha(n.fechaHoraProgramada || n.fecha);
      if (!d) return false;

      return d >= fechaSuspDate && n.estado !== "cancelada";
    });

    if (futuras.length > 0) {
      await Promise.all(
        futuras.map((n) =>
          updateDoc(
            doc(db, "usuarios", idUsuario, "notificaciones", n.id),
            { estado: "cancelada" }
          )
        )
      );

      setNotificaciones((prev) =>
        prev.map((n) =>
          futuras.find((f) => f.id === n.id)
            ? { ...n, estado: "cancelada" }
            : n
        )
      );
    }

    await addDoc(collection(db, "usuarios", idUsuario, "historial"), {
      tipo: "suspension",
      titulo: "Medicamento suspendido",
      descripcion: `${getLabelTipoMedicamento(tipo)} - ${nombreMed} suspendido el ${fechaSuspension}`,
      fecha: serverTimestamp(),
      autor: "Profesional",
    });

    setTratamiento((prev) => {
      if (!prev) return prev;

      const prevFuente = prev[tipo];
      if (!prevFuente) return prev;

      const prevArray = Array.isArray(prevFuente) ? [...prevFuente] : [prevFuente];
      prevArray[index] = actualizado;

      return {
        ...prev,
        [tipo]: Array.isArray(prevFuente) ? prevArray : actualizado,
      };
    });

    setModalSuspenderVisible(false);
    setMedSuspenderClave("");
  };

  // Finalizar tratamiento
  const validarFinalizacion = () => {
    if (!tipoFinalizacion) {
      alert(
        "Debes seleccionar el tipo de finalización (Punción o Cancelación de estímulo)."
      );
      return false;
    }

    if (tipoFinalizacion === "cancelacion_estimulo" && !motivoCancelacion) {
      alert("Debes seleccionar el motivo de cancelación del estímulo.");
      return false;
    }

    if (
      tipoFinalizacion === "cancelacion_estimulo" &&
      motivoCancelacion === "otro" &&
      !comentarioFinalizacion.trim()
    ) {
      const confirma = window.confirm(
        "Seleccionaste 'Otro motivo' sin detallar comentarios. ¿Deseás continuar igualmente?"
      );
      if (!confirma) return false;
    }

    return true;
  };

  const confirmarFinalizacionTratamiento = async () => {
    if (!tratamiento) return;
    if (!validarFinalizacion()) return;

    const confirma = window.confirm(
      "¿Estás seguro de que querés finalizar este tratamiento? Esta acción no se puede deshacer."
    );
    if (!confirma) return;

    try {
      setGuardandoFinalizacion(true);

      const tratamientoRef = doc(
        db,
        "usuarios",
        idUsuario,
        "tratamientos",
        idTratamiento
      );
      const tratSnap = await getDoc(tratamientoRef);
      if (!tratSnap.exists()) {
        alert("El tratamiento ya no existe.");
        setGuardandoFinalizacion(false);
        return;
      }

      const dataActual = tratSnap.data();
      const ahora = new Date();

      const payloadUpdate = {
        estado: "finalizado",
        fechaFin: serverTimestamp(),
        tipoFinalizacion,
        motivoCancelacion:
          tipoFinalizacion === "cancelacion_estimulo"
            ? motivoCancelacion
            : null,
        comentarioFinalizacion:
          comentarioFinalizacion.trim() ||
          dataActual.comentarioFinalizacion ||
          null,
      };

      // 1) Actualizar tratamiento
      await updateDoc(tratamientoRef, payloadUpdate);

      // 2) Registrar en tratamientos_historicos_global (stats)
      try {
        const medicamentosPlanificados =
          dataActual.medicamentosPlanificados || [];
        const nombresMedicamentos = Array.isArray(medicamentosPlanificados)
          ? [
              ...new Set(
                medicamentosPlanificados
                  .map(
                    (m) =>
                      m.nombreComercial || m.nombre || m.medicamento || ""
                  )
                  .filter(Boolean)
              ),
            ]
          : [];

        await addDoc(collection(db, "tratamientos_historicos_global"), {
          usuarioId: idUsuario,
          tratamientoId: idTratamiento,
          tipo: dataActual.tipo || null,
          fechaInicio: dataActual.fechaInicio || null,
          fechaFin: serverTimestamp(),
          medicamentosUsados: nombresMedicamentos,
          tipoFinalizacion,
          motivoCancelacion:
            tipoFinalizacion === "cancelacion_estimulo"
              ? motivoCancelacion
              : null,
          comentarioFinalizacion:
            comentarioFinalizacion.trim() ||
            dataActual.comentarioFinalizacion ||
            null,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn(
          "No se pudo registrar en tratamientos_historicos_global:",
          e
        );
      }

      // 3) Cancelar notificaciones del tratamiento
      try {
        const notisRef = collection(
          db,
          "usuarios",
          idUsuario,
          "notificaciones"
        );
        const qNotis = query(
          notisRef,
          where("tratamientoId", "==", idTratamiento)
        );
        const notisSnap = await getDocs(qNotis);
        const updates = [];

        notisSnap.forEach((docSnap) => {
          const dataN = docSnap.data();
          if (
            dataN.estado !== "cancelada" &&
            dataN.estado !== "cancelada_por_finalizacion"
          ) {
            updates.push(
              updateDoc(docSnap.ref, {
                estado: "cancelada_por_finalizacion",
              })
            );
          }
        });

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      } catch (e) {
        console.warn(
          "Error al cancelar notificaciones del tratamiento finalizado:",
          e
        );
      }

      // 4) Registrar en historial del usuario
      try {
        let desc = "";
        if (tipoFinalizacion === "puncion") {
          desc = "Finalización de tratamiento por punción.";
        } else if (tipoFinalizacion === "cancelacion_estimulo") {
          desc = `Cancelación de estímulo – Motivo: ${getLabelMotivoCancelacion(
            motivoCancelacion
          )}.`;
        }
        if (comentarioFinalizacion.trim()) {
          desc += ` Comentario: ${comentarioFinalizacion.trim()}`;
        }

        await addDoc(collection(db, "usuarios", idUsuario, "historial"), {
          tipo: "finalizacion_tratamiento",
          titulo: "Tratamiento finalizado",
          descripcion: desc || "Tratamiento finalizado.",
          fecha: serverTimestamp(),
          autor: "Profesional",
        });
      } catch (e) {
        console.warn("No se pudo registrar la finalización en historial:", e);
      }

      // Actualizar estado local
      setTratamiento((prev) =>
        prev
          ? {
              ...prev,
              ...payloadUpdate,
              fechaFin: ahora,
            }
          : prev
      );

      setModalFinalizarVisible(false);
      alert(
        "Tratamiento finalizado correctamente. Ahora podrás iniciar uno nuevo si lo necesitás."
      );
    } catch (e) {
      console.error("Error al finalizar tratamiento:", e);
      alert(
        "Hubo un problema al finalizar el tratamiento. Por favor, intenta nuevamente."
      );
    } finally {
      setGuardandoFinalizacion(false);
    }
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
                              ev.confirmada ?? ev.estado === "confirmado",
                              ev.estado
                            )}
                          </li>
                        ))}
                    </ul>

                    {/* Línea de suspensión, si existe */}
                    {datos.suspendidoEn && (
                      <p className="evento-suspension">
                        <strong>Suspensión:</strong>{" "}
                        {parseFecha(datos.suspendidoEn)?.toLocaleDateString() ||
                          "-"}{" "}
                        – Este medicamento fue suspendido.
                      </p>
                    )}

                    {esActivo && (
                      <div className="acciones-medicamento">
                        {!datos.suspendidoEn ? (
                          <>
                            <button
                              className="btn-extender"
                              onClick={() => abrirModal(key)}
                            >
                              Extender
                            </button>

                            <button
                              className="btn-suspender"
                              onClick={() => abrirModalSuspender(key)}
                            >
                              Suspender medicamento
                            </button>
                          </>
                        ) : (
                          <p style={{ color: "#c62828", fontWeight: 600 }}>
                            Este medicamento está suspendido
                          </p>
                        )}
                      </div>
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
              Nombre comercial:
              <select
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
              >
                <option value="">Seleccionar</option>
                <option value="Gonal">Gonal</option>
                <option value="Pergoveris">Pergoveris</option>
                <option value="Cetrotide">Cetrotide</option>
                <option value="Crinone">Crinone</option>
              </select>
            </label>

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

      {/* MODAL SUSPENDER MEDICAMENTO */}
      {modalSuspenderVisible && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button
              className="cerrar"
              onClick={() => setModalSuspenderVisible(false)}
            >
              <X size={20} />
            </button>
            <h4>Suspender medicamento</h4>

            <label>
              Fecha de suspensión:
              <input
                type="date"
                value={fechaSuspension}
                onChange={(e) => setFechaSuspension(e.target.value)}
              />
            </label>

            <p className="texto-advertencia">
              Esta acción marcará el medicamento como suspendido y cancelará
              las notificaciones futuras relacionadas en la app.
            </p>

            <button
              className="aplicar aplicar-suspension"
              onClick={confirmarSuspensionMedicamento}
            >
              <XCircle size={16} /> Confirmar suspensión
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
        {estudios.map((est, index) => {
          const fecha = parseFecha(est.fecha);
          return (
            <div key={index} className="card-estudio">
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
                  onClick={() => eliminarEstudio(index)}
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

      {/* BOTÓN FINALIZAR TRATAMIENTO */}
      {esActivo && (
        <div className="footer-finalizar">
          <button
            className="aplicar btn-finalizar-tratamiento"
            onClick={abrirModalFinalizar}
          >
            <CheckCircle size={16} /> Finalizar tratamiento
          </button>
        </div>
      )}

      {/* MODAL FINALIZAR TRATAMIENTO */}
      {modalFinalizarVisible && (
        <div className="modal-extension">
          <div className="modal-contenido">
            <button
              className="cerrar"
              onClick={cerrarModalFinalizar}
              disabled={guardandoFinalizacion}
            >
              <X size={20} />
            </button>
            <h4>Finalizar tratamiento</h4>

            <p className="texto-advertencia">
              Para finalizar el tratamiento, indicá el tipo de finalización y,
              si se trata de una cancelación de estímulo, el motivo
              correspondiente.
            </p>

            <label>
              Tipo de finalización:
              <select
                value={tipoFinalizacion}
                onChange={(e) => {
                  setTipoFinalizacion(e.target.value);
                  if (e.target.value !== "cancelacion_estimulo") {
                    setMotivoCancelacion("");
                  }
                }}
                disabled={guardandoFinalizacion}
              >
                <option value="">Seleccionar</option>
                {TIPOS_FINALIZACION.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </label>

            {tipoFinalizacion === "cancelacion_estimulo" && (
              <label>
                Motivo de cancelación del estímulo:
                <select
                  value={motivoCancelacion}
                  onChange={(e) => setMotivoCancelacion(e.target.value)}
                  disabled={guardandoFinalizacion}
                >
                  <option value="">Seleccionar</option>
                  {MOTIVOS_CANCELACION.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              Comentario adicional (opcional):
              <textarea
                rows={3}
                value={comentarioFinalizacion}
                onChange={(e) => setComentarioFinalizacion(e.target.value)}
                disabled={guardandoFinalizacion}
                placeholder="Ej: Estimulación completada previo a punción / Se suspende por enfermedad intercurrente..."
              />
            </label>

            <button
              className="aplicar aplicar-suspension"
              onClick={confirmarFinalizacionTratamiento}
              disabled={guardandoFinalizacion}
            >
              {guardandoFinalizacion ? (
                "Finalizando..."
              ) : (
                <>
                  <CheckCircle size={16} /> Confirmar finalización
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleTratamiento;
