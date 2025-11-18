import "./PerfilPaciente.scss";
import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useParams, useNavigate } from "react-router-dom";

const camposClinicos = [
  { key: "nombre", label: "Nombre", type: "text" },
  { key: "apellido", label: "Apellido", type: "text" },
  { key: "telefono", label: "Teléfono", type: "text" },

  { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date" },
  { key: "altura", label: "Altura (cm)", type: "number" },
  { key: "peso", label: "Peso (kg)", type: "number" },
  {
    key: "grupoSanguineo",
    label: "Grupo sanguíneo",
    type: "select",
    options: ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"],
  },

  { key: "fum", label: "FUM", type: "date" },
  {
    key: "ritmoMenstrual",
    label: "Ritmo menstrual",
    type: "select",
    options: ["", "Regular", "Irregular", "Amenorrea"],
  },
  {
    key: "ciclosRegulares",
    label: "Ciclos regulares",
    type: "select",
    options: ["", "Sí", "No"],
  },
  { key: "duracionCiclo", label: "Duración del ciclo (días)", type: "number" },

  { key: "gestasG", label: "G (gestas)", type: "number" },
  { key: "gestasP", label: "P (partos)", type: "number" },
  { key: "gestasC", label: "C (cesáreas)", type: "number" },
  { key: "gestasA", label: "A (abortos)", type: "number" },
  { key: "gestasE", label: "E (ectópicos)", type: "number" },

  {
    key: "dismenorrea",
    label: "Dismenorrea",
    type: "select",
    options: ["", "No", "Leve", "Moderada", "Severa"],
  },
  {
    key: "dispareunia",
    label: "Dispareunia",
    type: "select",
    options: ["", "No", "Leve", "Moderada", "Severa"],
  },

  {
    key: "pareja",
    label: "Tipo de pareja",
    type: "select",
    options: ["", "femenino", "masculino", "sin pareja"],
  },
  { key: "nombrePareja", label: "Nombre de la pareja", type: "text" },

  {
    key: "tieneAlergias",
    label: "¿Tiene alergias?",
    type: "select",
    options: ["", "Sí", "No"],
  },
  { key: "detalleAlergias", label: "Detalle de alergias", type: "textarea" },
  { key: "patologias", label: "Patologías relevantes", type: "textarea" },
  {
    key: "medicacionHabitual",
    label: "Medicación habitual",
    type: "textarea",
  },

  {
    key: "antecedentesQuirurgicos",
    label: "Antecedentes quirúrgicos",
    type: "select",
    options: ["", "Sí", "No"],
  },
  {
    key: "detalleAntecedentesQuirurgicos",
    label: "Detalle de antecedentes quirúrgicos",
    type: "textarea",
  },

  { key: "fivPrevias", label: "FIV previas", type: "number" },
  { key: "iiuPrevias", label: "IIU previas", type: "number" },
  {
    key: "crioOvulosPrevios",
    label: "Criopreservación de ovocitos previa",
    type: "number",
  },
  {
    key: "transferenciasPrevias",
    label: "Transferencias embrionarias previas",
    type: "number",
  },
];

const MEDICAMENTOS_COMERCIALES = ["GONAL", "PERGOVERIS", "CETROTIDE", "CRINONE"];

const formatFecha = (f) => {
  if (!f) return "-";
  if (typeof f === "string") return new Date(f).toLocaleDateString("es-AR");
  if (f.toDate) return f.toDate().toLocaleDateString("es-AR");
  if (f.seconds) return new Date(f.seconds * 1000).toLocaleDateString("es-AR");
  return "-";
};

const combinarFechaHora = (fechaStr, horaStr) => {
  if (!fechaStr || !horaStr) return null;
  const [year, month, day] = fechaStr.split("-").map(Number);
  const [hour, minute] = horaStr.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute || 0);
};

const agregarDias = (date, dias) => {
  if (!date) return null;
  const d = new Date(date);
  d.setDate(d.getDate() + dias);
  return d;
};

// 🔥 AHORA CADA MEDICAMENTO TIENE "DOSIS"
const crearEstadoInicialTratamiento = () => ({
  tipo: "",
  fum: "",
  fechaInicio: "",
  medicamentosPlanificados: MEDICAMENTOS_COMERCIALES.reduce(
    (acc, nombre) => ({
      ...acc,
      [nombre]: { selected: false, fecha: "", hora: "", dias: "", dosis: "" },
    }),
    {}
  ),
});

const crearEstadoInicialEstudio = () => ({
  tipo: "",
  subtipo: "",
  fecha: "",
  fsh: "",
  lh: "",
  estradiol: "",
  ham: "",
  progesterona: "",
  recuentoFolicular: "",
  ovarioDerecho: "",
  ovarioIzquierdo: "",
  comentarios: "",
});

const PerfilPaciente = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState(null);
  const [datosEditados, setDatosEditados] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [tratamientoActivo, setTratamientoActivo] = useState(null);
  const [mostrarModalInicio, setMostrarModalInicio] = useState(false);
  const [nuevoTratamiento, setNuevoTratamiento] = useState(
    crearEstadoInicialTratamiento()
  );

  const [evoluciones, setEvoluciones] = useState([]);
  const [nuevaEvolucion, setNuevaEvolucion] = useState("");
  const [seccionAbierta, setSeccionAbierta] = useState(null);

  const [estudios, setEstudios] = useState([]);
  const [mostrarModalEstudio, setMostrarModalEstudio] = useState(false);
  const [nuevoEstudio, setNuevoEstudio] = useState(crearEstadoInicialEstudio());

  useEffect(() => {
    const obtenerDatos = async () => {
      const docRef = doc(db, "usuarios", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const datos = docSnap.data() || {};

        Object.keys(datos).forEach((key) => {
          if (datos[key] === undefined || datos[key] === null)
            datos[key] = "";
        });

        setPaciente(datos);
        setDatosEditados(datos);

        const tratamientoRef = doc(db, `usuarios/${id}/tratamientos/activo`);
        const tratamientoSnap = await getDoc(tratamientoRef);
        if (tratamientoSnap.exists()) {
          setTratamientoActivo(tratamientoSnap.data());
        }
      } else {
        console.error("Paciente no encontrado");
        setPaciente({ error: true });
      }
    };

    const q = query(
      collection(db, `usuarios/${id}/evoluciones`),
      orderBy("fecha", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const evolList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvoluciones(evolList);
    });

    obtenerDatos();
    return () => unsub();
  }, [id]);

  const guardarCambios = async () => {
    const ref = doc(db, "usuarios", id);
    await updateDoc(ref, datosEditados);
    setPaciente(datosEditados);
    setModoEdicion(false);
    setMostrarModal(false);
  };

  const guardarEvolucion = async () => {
    if (!nuevaEvolucion.trim()) return;
    await addDoc(collection(db, `usuarios/${id}/evoluciones`), {
      fecha: new Date(),
      texto: nuevaEvolucion.trim(),
      creadoPor: "Dr.",
      timestamp: Date.now(),
    });
    setNuevaEvolucion("");
  };

  const eliminarEstudio = async (idEstudio) => {
    try {
      await deleteDoc(
        doc(db, `usuarios/${id}/tratamientos/activo/estudios/${idEstudio}`)
      );
      setEstudios((prev) => prev.filter((est) => est.id !== idEstudio));
    } catch (err) {
      console.error("Error al eliminar estudio:", err);
    }
  };

  const handleToggle = (seccion) => {
    setSeccionAbierta((prev) => (prev === seccion ? null : seccion));
  };

  useEffect(() => {
    const cargarEstudios = async () => {
      if (!id || !tratamientoActivo) return;

      const estudiosRef = collection(
        db,
        `usuarios/${id}/tratamientos/activo/estudios`
      );
      const snapshot = await getDocs(estudiosRef);
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEstudios(lista);
    };

    cargarEstudios();
  }, [id, tratamientoActivo]);

  const renderValor = (campo, valorRaw) => {
    const valor = valorRaw ?? "";
    if (!valor) return "-";
    if (campo.type === "date") return formatFecha(valor);
    return valor;
  };

// 🔥  CONTINÚA EXACTAMENTE AQUÍ EN LA PARTE 2

  const handleChangeCampo = (key, value) => {
    setDatosEditados((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // CAMBIOS TRATAMIENTO
  const handleChangeNuevoTratamiento = (field, value) => {
    setNuevoTratamiento((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // TOGGLE MEDICAMENTO
  const toggleMedicamentoPlanificado = (nombre) => {
    setNuevoTratamiento((prev) => {
      const actual = prev.medicamentosPlanificados[nombre];
      return {
        ...prev,
        medicamentosPlanificados: {
          ...prev.medicamentosPlanificados,
          [nombre]: { ...actual, selected: !actual.selected },
        },
      };
    });
  };

  const changeFechaMedicamento = (nombre, fecha) => {
    setNuevoTratamiento((prev) => ({
      ...prev,
      medicamentosPlanificados: {
        ...prev.medicamentosPlanificados,
        [nombre]: { ...prev.medicamentosPlanificados[nombre], fecha },
      },
    }));
  };

  const changeHoraMedicamento = (nombre, hora) => {
    setNuevoTratamiento((prev) => ({
      ...prev,
      medicamentosPlanificados: {
        ...prev.medicamentosPlanificados,
        [nombre]: { ...prev.medicamentosPlanificados[nombre], hora },
      },
    }));
  };

  const changeDiasMedicamento = (nombre, dias) => {
    setNuevoTratamiento((prev) => ({
      ...prev,
      medicamentosPlanificados: {
        ...prev.medicamentosPlanificados,
        [nombre]: { ...prev.medicamentosPlanificados[nombre], dias },
      },
    }));
  };

  // 🔥 NUEVO: CAMBIAR DOSIS
  const changeDosisMedicamento = (nombre, dosis) => {
    setNuevoTratamiento((prev) => ({
      ...prev,
      medicamentosPlanificados: {
        ...prev.medicamentosPlanificados,
        [nombre]: { ...prev.medicamentosPlanificados[nombre], dosis },
      },
    }));
  };

  // CREAR TRATAMIENTO (GUARDA DOSIS)
  const crearTratamiento = async () => {
    if (!nuevoTratamiento.tipo || !nuevoTratamiento.fechaInicio) {
      alert("Completá tipo y fecha de inicio");
      return;
    }

    const medsArray = Object.entries(
      nuevoTratamiento.medicamentosPlanificados
    )
      .filter(([_, v]) => v.selected)
      .map(([nombre, v]) => ({
        nombre,
        fechaPrimeraAplicacion: v.fecha ? new Date(v.fecha) : null,
        horaAplicacion: v.hora || "",
        duracionDias: v.dias ? parseInt(v.dias, 10) || null : null,
        dosis: v.dosis || "", // 🔥 NUEVO
      }));

    const tratamientoDoc = {
      tipo: nuevoTratamiento.tipo,
      estado: "activo",
      fechaInicio: nuevoTratamiento.fechaInicio
        ? new Date(nuevoTratamiento.fechaInicio)
        : null,
      fum: nuevoTratamiento.fum ? new Date(nuevoTratamiento.fum) : null,
      medicamentosPlanificados: medsArray,
      creadoEn: new Date(),
    };

    try {
      const ref = doc(db, `usuarios/${id}/tratamientos/activo`);
      await setDoc(ref, tratamientoDoc);
      setTratamientoActivo(tratamientoDoc);

      // Notificaciones
      for (const med of medsArray) {
        if (!med.fechaPrimeraAplicacion || !med.horaAplicacion || !med.duracionDias)
          continue;

        const fechaBaseStr = med.fechaPrimeraAplicacion
          .toISOString()
          .slice(0, 10);
        const fechaHoraBase = combinarFechaHora(
          fechaBaseStr,
          med.horaAplicacion
        );

        for (let i = 0; i < med.duracionDias; i++) {
          const fechaHoraNotificacion = agregarDias(fechaHoraBase, i);

          await addDoc(collection(db, `usuarios/${id}/notificaciones`), {
            tipo: "medicacion",
            nivel: "primaria",
            medicamento: med.nombre,
            dosis: med.dosis || "", // 🔥 NUEVO
            tratamientoId: "activo",
            fechaHoraProgramada: fechaHoraNotificacion,
            diaTratamiento: i + 1,
            estado: "pendiente",
            createdAt: new Date(),
          });
        }
      }

      setMostrarModalInicio(false);
      setNuevoTratamiento(crearEstadoInicialTratamiento());
    } catch (err) {
      console.error(err);
      alert("Error al crear tratamiento");
    }
  };

  const handleChangeNuevoEstudio = (field, value) => {
    setNuevoEstudio((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const guardarEstudio = async () => {
    if (!nuevoEstudio.tipo || !nuevoEstudio.fecha) {
      alert("Completá tipo de estudio y fecha");
      return;
    }

    const docEstudio = {
      tipoEstudio:
        nuevoEstudio.tipo === "analisis" ? "Análisis" : "Ecografía",
      subtipo: nuevoEstudio.subtipo || "",
      fecha: new Date(nuevoEstudio.fecha),
      fsh: nuevoEstudio.fsh || "",
      lh: nuevoEstudio.lh || "",
      estradiol: nuevoEstudio.estradiol || "",
      ham: nuevoEstudio.ham || "",
      progesterona: nuevoEstudio.progesterona || "",
      recuentoFolicular: nuevoEstudio.recuentoFolicular || "",
      ovarioDerecho: nuevoEstudio.ovarioDerecho || "",
      ovarioIzquierdo: nuevoEstudio.ovarioIzquierdo || "",
      comentarios: nuevoEstudio.comentarios || "",
      creadoEn: new Date(),
    };

    try {
      const ref = collection(
        db,
        `usuarios/${id}/tratamientos/activo/estudios`
      );
      const nuevoRef = await addDoc(ref, docEstudio);

      setEstudios((prev) => [...prev, { id: nuevoRef.id, ...docEstudio }]);
      setMostrarModalEstudio(false);
      setNuevoEstudio(crearEstadoInicialEstudio());
    } catch (err) {
      console.error(err);
      alert("Error al guardar estudio");
    }
  };

  return (
    <div className="perfil-paciente">
      {paciente?.error ? (
        <p>No se encontró el paciente.</p>
      ) : paciente ? (
        <>
          <div className="perfil-header">
            <div>
              <h2>
                {paciente.nombre} {paciente.apellido}
              </h2>
              <p>
                <strong>Email:</strong> {paciente.email}
              </p>
              <p>
                <strong>Estado:</strong>{" "}
                {tratamientoActivo ? "Tratamiento activo" : "Sin tratamiento"}
              </p>
            </div>
          </div>

          <div className="cards-container">
            <div className="card" onClick={() => handleToggle("datos")}>
              📋 Datos clínicos
            </div>
            <div className="card" onClick={() => handleToggle("tratamiento")}>
              💊 Tratamientos
            </div>
            <div className="card" onClick={() => handleToggle("evolucion")}>
              📈 Evolución diaria
            </div>
            <div className="card" onClick={() => handleToggle("estudios")}>
              🧪 Estudios
            </div>
          </div>

          {/* --- DATOS CLÍNICOS --- */}
          {seccionAbierta === "datos" && (
            <div className="seccion seccion-datos">
              <div className="seccion-header">
                <h3>Datos clínicos</h3>
                <button
                  className="editar"
                  onClick={() => {
                    if (modoEdicion) {
                      setDatosEditados(paciente);
                    }
                    setModoEdicion(!modoEdicion);
                  }}
                >
                  {modoEdicion ? "Cancelar edición" : "Editar paciente"}
                </button>
              </div>

              <div className="grid-datos">
                {camposClinicos.map((campo) => (
                  <div key={campo.key} className="campo-clinico">
                    <label>
                      <span>{campo.label}</span>
                      {modoEdicion ? (
                        campo.type === "select" ? (
                          <select
                            value={datosEditados[campo.key] ?? ""}
                            onChange={(e) =>
                              handleChangeCampo(campo.key, e.target.value)
                            }
                          >
                            {campo.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt === "" ? "Seleccionar..." : opt}
                              </option>
                            ))}
                          </select>
                        ) : campo.type === "textarea" ? (
                          <textarea
                            value={datosEditados[campo.key] ?? ""}
                            onChange={(e) =>
                              handleChangeCampo(campo.key, e.target.value)
                            }
                          />
                        ) : (
                          <input
                            type={
                              campo.type === "date" ||
                              campo.type === "number"
                                ? campo.type
                                : "text"
                            }
                            value={datosEditados[campo.key] ?? ""}
                            onChange={(e) =>
                              handleChangeCampo(campo.key, e.target.value)
                            }
                          />
                        )
                      ) : (
                        <p className="valor">
                          {renderValor(campo, paciente[campo.key])}
                        </p>
                      )}
                    </label>
                  </div>
                ))}
              </div>

              {modoEdicion && (
                <div className="acciones-guardar">
                  <button onClick={() => setMostrarModal(true)}>
                    Guardar cambios
                  </button>
                </div>
              )}
            </div>
          )}

          {/* --- TRATAMIENTO --- */}
          {seccionAbierta === "tratamiento" && (
            <div className="seccion seccion-tratamiento">
              <div className="seccion-header">
                <h3>Tratamiento</h3>
                {!tratamientoActivo && (
                  <button
                    className="btn-iniciar-tratamiento"
                    onClick={() => setMostrarModalInicio(true)}
                  >
                    Iniciar tratamiento
                  </button>
                )}
              </div>

              {tratamientoActivo ? (
                <>
                  <p>
                    <strong>Tipo:</strong> {tratamientoActivo.tipo}
                  </p>
                  <p>
                    <strong>FUM:</strong>{" "}
                    {tratamientoActivo.fum
                      ? formatFecha(tratamientoActivo.fum)
                      : "-"}
                  </p>
                  <p>
                    <strong>Inicio:</strong>{" "}
                    {tratamientoActivo.fechaInicio
                      ? formatFecha(tratamientoActivo.fechaInicio)
                      : "-"}
                  </p>

                  {tratamientoActivo.medicamentosPlanificados &&
                    tratamientoActivo.medicamentosPlanificados.length > 0 && (
                      <div className="meds-planificados">
                        <p>
                          <strong>Medicamentos planificados:</strong>
                        </p>
                        <ul>
                          {tratamientoActivo.medicamentosPlanificados.map(
                            (m, idx) => (
                              <li key={idx}>
                                {m.nombre}
                                {m.dosis && ` · ${m.dosis}`}
                                {m.fechaPrimeraAplicacion &&
                                  ` · ${formatFecha(
                                    m.fechaPrimeraAplicacion
                                  )}`}
                                {m.horaAplicacion && ` · ${m.horaAplicacion}`}
                                {m.duracionDias &&
                                  ` · ${m.duracionDias} días`}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  <div style={{ marginTop: "20px" }}>
                    <button onClick={() => navigate(`/tratamientos/${id}/activo`)}>
                      Ver detalle completo
                    </button>
                  </div>
                </>
              ) : (
                <p>No hay tratamiento activo.</p>
              )}
            </div>
          )}

          {/* --- EVOLUCION --- */}
          {seccionAbierta === "evolucion" && (
            <div className="seccion">
              <h3>Evolución diaria</h3>
              {evoluciones.length > 0 ? (
                evoluciones.map((evo) => (
                  <div key={evo.id}>
                    <p>
                      <strong>{formatFecha(evo.fecha)}:</strong> {evo.texto}
                    </p>
                  </div>
                ))
              ) : (
                <p>No hay evoluciones registradas</p>
              )}
              <textarea
                placeholder="Nueva evolución..."
                value={nuevaEvolucion}
                onChange={(e) => setNuevaEvolucion(e.target.value)}
              />
              <button onClick={guardarEvolucion}>Guardar evolución</button>
            </div>
          )}

          {/* --- ESTUDIOS --- */}
          {seccionAbierta === "estudios" && (
            <div className="seccion estudios">
              <div className="seccion-estudios-header">
                <h3>Estudios clínicos</h3>
                {tratamientoActivo && (
                  <button
                    className="btn-agregar-estudio"
                    onClick={() => setMostrarModalEstudio(true)}
                  >
                    + Agregar estudio
                  </button>
                )}
              </div>

              {estudios.length === 0 ? (
                <p>No hay estudios cargados</p>
              ) : (
                <div className="estudios-scroll">
                  {estudios.map((est) => (
                    <div key={est.id} className="card-estudio">
                      <p>
                        <strong>Fecha:</strong> {formatFecha(est.fecha)}
                      </p>
                      <p>
                        <strong>Tipo:</strong> {est.tipoEstudio}
                        {est.subtipo ? ` · ${est.subtipo}` : ""}
                      </p>

                      {est.fsh && (
                        <p>
                          <strong>FSH:</strong> {est.fsh}
                        </p>
                      )}
                      {est.lh && (
                        <p>
                          <strong>LH:</strong> {est.lh}
                        </p>
                      )}
                      {est.estradiol && (
                        <p>
                          <strong>Estradiol:</strong> {est.estradiol}
                        </p>
                      )}
                      {est.ham && (
                        <p>
                          <strong>HAM:</strong> {est.ham}
                        </p>
                      )}
                      {est.progesterona && (
                        <p>
                          <strong>Progesterona:</strong> {est.progesterona}
                        </p>
                      )}

                      {est.recuentoFolicular && (
                        <p>
                          <strong>Recuento folicular total:</strong>{" "}
                          {est.recuentoFolicular}
                        </p>
                      )}
                      {est.ovarioDerecho && (
                        <p>
                          <strong>Ovario derecho:</strong> {est.ovarioDerecho}
                        </p>
                      )}
                      {est.ovarioIzquierdo && (
                        <p>
                          <strong>Ovario izquierdo:</strong>{" "}
                          {est.ovarioIzquierdo}
                        </p>
                      )}

                      {est.comentarios && (
                        <p>
                          <strong>Comentarios:</strong> {est.comentarios}
                        </p>
                      )}

                      <button onClick={() => eliminarEstudio(est.id)}>
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONFIRMAR CAMBIOS */}
          {mostrarModal && (
            <div className="modal-confirmacion">
              <div className="modal-contenido">
                <p>¿Desea guardar los cambios realizados?</p>
                <div className="modal-botones">
                  <button onClick={guardarCambios}>Confirmar</button>
                  <button onClick={() => setMostrarModal(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL INICIO TRATAMIENTO */}
          {mostrarModalInicio && (
            <div className="modal-inicio-tratamiento">
              <div className="modal-inicio-contenido">
                <h3>Iniciar tratamiento</h3>

                <div className="form-group">
                  <label>
                    Tipo de tratamiento
                    <select
                      value={nuevoTratamiento.tipo}
                      onChange={(e) =>
                        handleChangeNuevoTratamiento("tipo", e.target.value)
                      }
                    >
                      <option value="">Seleccionar...</option>
                      <option value="FIV">FIV</option>
                      <option value="ICSI">ICSI</option>
                      <option value="CRIO DE OVULOS">CRIO DE OVULOS</option>
                      <option value="TRANSFERENCIA EMBRIONARIA">
                        TRANSFERENCIA EMBRIONARIA
                      </option>
                      <option value="INSEMINACION INTRAUTERINA (IIU)">
                        INSEMINACION INTRAUTERINA (IIU)
                      </option>
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      FUM (opcional)
                      <input
                        type="date"
                        value={nuevoTratamiento.fum}
                        onChange={(e) =>
                          handleChangeNuevoTratamiento(
                            "fum",
                            e.target.value
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      Fecha de inicio
                      <input
                        type="date"
                        value={nuevoTratamiento.fechaInicio}
                        onChange={(e) =>
                          handleChangeNuevoTratamiento(
                            "fechaInicio",
                            e.target.value
                          )
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* MEDICAMENTOS */}
                <div className="form-group meds-group">
                  <span className="label-inline">
                    Medicamentos planificados
                  </span>

                  <div className="meds-checks">
                    {MEDICAMENTOS_COMERCIALES.map((med) => {
                      const estado =
                        nuevoTratamiento.medicamentosPlanificados[med];

                      return (
                        <div key={med} className="med-check">
                          <label className="med-check-main">
                            <input
                              type="checkbox"
                              checked={estado.selected}
                              onChange={() => toggleMedicamentoPlanificado(med)}
                            />
                            <span>{med}</span>
                          </label>

                          {/* CAMPOS EXTRA SI ESTÁ ACTIVADO */}
                          {estado.selected && (
                            <div className="med-extra">
                              <label>
                                Fecha primera aplicación
                                <input
                                  type="date"
                                  value={estado.fecha}
                                  onChange={(e) =>
                                    changeFechaMedicamento(med, e.target.value)
                                  }
                                />
                              </label>

                              <label>
                                Hora de aplicación
                                <input
                                  type="time"
                                  value={estado.hora}
                                  onChange={(e) =>
                                    changeHoraMedicamento(med, e.target.value)
                                  }
                                />
                              </label>

                              {/* 🔥 NUEVO CAMPO — DOSIS */}
                              <label>
                                Dosis
                                <input
                                  type="text"
                                  placeholder="Ej: 75 UI"
                                  value={estado.dosis}
                                  onChange={(e) =>
                                    changeDosisMedicamento(med, e.target.value)
                                  }
                                />
                              </label>

                              <label>
                                Días de aplicación
                                <input
                                  type="number"
                                  min="1"
                                  value={estado.dias}
                                  onChange={(e) =>
                                    changeDiasMedicamento(med, e.target.value)
                                  }
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="modal-botones">
                  <button onClick={crearTratamiento}>Confirmar</button>
                  <button
                    onClick={() => {
                      setMostrarModalInicio(false);
                      setNuevoTratamiento(crearEstadoInicialTratamiento());
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL ESTUDIO */}
          {mostrarModalEstudio && (
            <div className="modal-estudio">
              <div className="modal-estudio-contenido">
                <h3>Agregar estudio</h3>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Tipo de estudio
                      <select
                        value={nuevoEstudio.tipo}
                        onChange={(e) =>
                          handleChangeNuevoEstudio("tipo", e.target.value)
                        }
                      >
                        <option value="">Seleccionar...</option>
                        <option value="analisis">Análisis</option>
                        <option value="ecografia">Ecografía</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-group">
                    <label>
                      Fecha
                      <input
                        type="date"
                        value={nuevoEstudio.fecha}
                        onChange={(e) =>
                          handleChangeNuevoEstudio("fecha", e.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>

                {/* OPCIONES ANÁLISIS */}
                {nuevoEstudio.tipo === "analisis" && (
                  <>
                    <div className="form-group">
                      <label>
                        Tipo de análisis
                        <select
                          value={nuevoEstudio.subtipo}
                          onChange={(e) =>
                            handleChangeNuevoEstudio("subtipo", e.target.value)
                          }
                        >
                          <option value="">Seleccionar...</option>
                          <option value="Previo al estímulo">
                            Previo al estímulo
                          </option>
                          <option value="Laboratorio general">
                            Laboratorio general
                          </option>
                        </select>
                      </label>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          FSH
                          <input
                            type="text"
                            value={nuevoEstudio.fsh}
                            onChange={(e) =>
                              handleChangeNuevoEstudio("fsh", e.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="form-group">
                        <label>
                          LH
                          <input
                            type="text"
                            value={nuevoEstudio.lh}
                            onChange={(e) =>
                              handleChangeNuevoEstudio("lh", e.target.value)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          Estradiol
                          <input
                            type="text"
                            value={nuevoEstudio.estradiol}
                            onChange={(e) =>
                              handleChangeNuevoEstudio(
                                "estradiol",
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="form-group">
                        <label>
                          HAM
                          <input
                            type="text"
                            value={nuevoEstudio.ham}
                            onChange={(e) =>
                              handleChangeNuevoEstudio("ham", e.target.value)
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>
                        Progesterona
                        <input
                          type="text"
                          value={nuevoEstudio.progesterona}
                          onChange={(e) =>
                            handleChangeNuevoEstudio(
                              "progesterona",
                              e.target.value
                            )
                          }
                        />
                      </label>
                    </div>
                  </>
                )}

                {/* OPCIONES ECOGRAFÍA */}
                {nuevoEstudio.tipo === "ecografia" && (
                  <>
                    <div className="form-group">
                      <label>
                        Tipo de ecografía
                        <select
                          value={nuevoEstudio.subtipo}
                          onChange={(e) =>
                            handleChangeNuevoEstudio("subtipo", e.target.value)
                          }
                        >
                          <option value="">Seleccionar...</option>
                          <option value="Basal">Basal</option>
                          <option value="En estimulación">En estimulación</option>
                        </select>
                      </label>
                    </div>

                    <div className="form-group">
                      <label>
                        Recuento folicular total
                        <input
                          type="text"
                          value={nuevoEstudio.recuentoFolicular}
                          onChange={(e) =>
                            handleChangeNuevoEstudio(
                              "recuentoFolicular",
                              e.target.value
                            )
                          }
                        />
                      </label>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>
                          Ovario derecho
                          <input
                            type="text"
                            value={nuevoEstudio.ovarioDerecho}
                            onChange={(e) =>
                              handleChangeNuevoEstudio(
                                "ovarioDerecho",
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="form-group">
                        <label>
                          Ovario izquierdo
                          <input
                            type="text"
                            value={nuevoEstudio.ovarioIzquierdo}
                            onChange={(e) =>
                              handleChangeNuevoEstudio(
                                "ovarioIzquierdo",
                                e.target.value
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label>
                    Comentarios
                    <textarea
                      value={nuevoEstudio.comentarios}
                      onChange={(e) =>
                        handleChangeNuevoEstudio("comentarios", e.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="modal-botones">
                  <button onClick={guardarEstudio}>Guardar estudio</button>
                  <button
                    onClick={() => {
                      setMostrarModalEstudio(false);
                      setNuevoEstudio(crearEstadoInicialEstudio());
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p>Cargando datos...</p>
      )}
    </div>
  );
};

export default PerfilPaciente;
