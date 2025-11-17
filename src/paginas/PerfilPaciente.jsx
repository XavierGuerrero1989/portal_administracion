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
import { useParams } from "react-router-dom";

const camposClinicos = [
  // Identificación básica
  { key: "nombre", label: "Nombre", type: "text" },
  { key: "apellido", label: "Apellido", type: "text" },
  { key: "telefono", label: "Teléfono", type: "text" },

  // Datos generales
  { key: "fechaNacimiento", label: "Fecha de nacimiento", type: "date" },
  { key: "altura", label: "Altura (cm)", type: "number" },
  { key: "peso", label: "Peso (kg)", type: "number" },
  {
    key: "grupoSanguineo",
    label: "Grupo sanguíneo",
    type: "select",
    options: ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"],
  },

  // Menstruación y ciclos
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
  {
    key: "duracionCiclo",
    label: "Duración del ciclo (días)",
    type: "number",
  },

  // Gestas (G P C A E)
  { key: "gestasG", label: "G (gestas)", type: "number" },
  { key: "gestasP", label: "P (partos)", type: "number" },
  { key: "gestasC", label: "C (cesáreas)", type: "number" },
  { key: "gestasA", label: "A (abortos)", type: "number" },
  { key: "gestasE", label: "E (ectópicos)", type: "number" },

  // Dolor
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

  // Pareja
  {
    key: "pareja",
    label: "Tipo de pareja",
    type: "select",
    options: ["", "femenino", "masculino", "sin pareja"],
  },
  { key: "nombrePareja", label: "Nombre de la pareja", type: "text" },

  // Alergias / patologías / medicación
  {
    key: "tieneAlergias",
    label: "¿Tiene alergias?",
    type: "select",
    options: ["", "Sí", "No"],
  },
  {
    key: "detalleAlergias",
    label: "Detalle de alergias",
    type: "textarea",
  },
  { key: "patologias", label: "Patologías relevantes", type: "textarea" },
  {
    key: "medicacionHabitual",
    label: "Medicación habitual",
    type: "textarea",
  },

  // Antecedentes quirúrgicos
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

  // Tratamientos previos
  {
    key: "fivPrevias",
    label: "FIV previas",
    type: "number",
  },
  {
    key: "iiuPrevias",
    label: "IIU previas",
    type: "number",
  },
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

const MEDICAMENTOS_COMERCIALES = [
  "GONAL",
  "PERGOVERIS",
  "CETROTIDE",
  "CRINONE",
];

const formatFecha = (f) => {
  if (!f) return "-";
  if (typeof f === "string") return new Date(f).toLocaleDateString("es-AR");
  if (f.toDate) return f.toDate().toLocaleDateString("es-AR");
  if (f.seconds) return new Date(f.seconds * 1000).toLocaleDateString("es-AR");
  return "-";
};

const PerfilPaciente = () => {
  const { id } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [datosEditados, setDatosEditados] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  const [tratamientoActivo, setTratamientoActivo] = useState(null);
  const [mostrarModalInicio, setMostrarModalInicio] = useState(false);
  const [nuevoTratamiento, setNuevoTratamiento] = useState({
    tipo: "",
    fum: "",
    fechaInicio: "",
    medicamentosPlanificados: [],
  });

  const [evoluciones, setEvoluciones] = useState([]);
  const [nuevaEvolucion, setNuevaEvolucion] = useState("");
  const [seccionAbierta, setSeccionAbierta] = useState(null);
  const [estudios, setEstudios] = useState([]);

  useEffect(() => {
    const obtenerDatos = async () => {
      const docRef = doc(db, "usuarios", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const datos = docSnap.data() || {};

        Object.keys(datos).forEach((key) => {
          if (datos[key] === undefined || datos[key] === null) datos[key] = "";
        });

        setPaciente(datos);
        setDatosEditados(datos);

        const tratamientoRef = doc(db, `usuarios/${id}/tratamientos/activo`);
        const tratamientoSnap = await getDoc(tratamientoRef);
        if (tratamientoSnap.exists()) {
          setTratamientoActivo(tratamientoSnap.data());
        }
      } else {
        console.error("Paciente no encontrado con ID:", id);
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
      creadoPor: "Dr. Nombre",
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
    if (seccionAbierta === seccion) {
      setSeccionAbierta(null);
    } else {
      setSeccionAbierta(seccion);
    }
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

  const handleChangeCampo = (key, value) => {
    setDatosEditados((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleChangeNuevoTratamiento = (field, value) => {
    setNuevoTratamiento((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleMedicamentoPlanificado = (nombre) => {
    setNuevoTratamiento((prev) => {
      const yaEsta = prev.medicamentosPlanificados.includes(nombre);
      return {
        ...prev,
        medicamentosPlanificados: yaEsta
          ? prev.medicamentosPlanificados.filter((m) => m !== nombre)
          : [...prev.medicamentosPlanificados, nombre],
      };
    });
  };

  const crearTratamiento = async () => {
    if (!nuevoTratamiento.tipo || !nuevoTratamiento.fechaInicio) {
      alert("Por favor, complete al menos el tipo de tratamiento y la fecha de inicio.");
      return;
    }

    const tratamientoDoc = {
      tipo: nuevoTratamiento.tipo,
      estado: "activo",
      fechaInicio: nuevoTratamiento.fechaInicio
        ? new Date(nuevoTratamiento.fechaInicio)
        : null,
      fum: nuevoTratamiento.fum ? new Date(nuevoTratamiento.fum) : null,
      medicamentosPlanificados: nuevoTratamiento.medicamentosPlanificados,
      creadoEn: new Date(),
    };

    try {
      const ref = doc(db, `usuarios/${id}/tratamientos/activo`);
      await setDoc(ref, tratamientoDoc);
      setTratamientoActivo(tratamientoDoc);
      setMostrarModalInicio(false);
    } catch (err) {
      console.error("Error al crear tratamiento:", err);
      alert("Ocurrió un error al iniciar el tratamiento.");
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
                {tratamientoActivo ? "Tratamiento activo" : "Sin tratamiento activo"}
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
                              campo.type === "date" || campo.type === "number"
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
                            (m) => (
                              <li key={m}>{m}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  <div className="bloque-medicamentos">
                    {["fsh", "hmg", "antagonista", "viaOral"].map((tipo) => {
                      const grupo = tratamientoActivo[tipo];
                      if (!grupo) return null;
                      const lista = Array.isArray(grupo) ? grupo : [grupo];
                      return (
                        <div key={tipo}>
                          <h4>{tipo.toUpperCase()}</h4>
                          {lista.map((med, idx) => (
                            <div key={idx} className="card-medicamento">
                              <p>
                                <strong>Nombre:</strong> {med.medicamento}
                              </p>
                              <p>
                                <strong>Dosis:</strong> {med.dosis}
                              </p>
                              <p>
                                <strong>Hora:</strong> {med.hora}
                              </p>
                              <p>
                                <strong>Días:</strong>{" "}
                                {typeof med.duracion === "number"
                                  ? med.duracion
                                  : "-"}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: "20px" }}>
                    <button
                      onClick={() =>
                        (window.location.href = `/detalle-tratamiento/${id}/activo`)
                      }
                    >
                      Ver detalle completo
                    </button>
                  </div>
                </>
              ) : (
                <p>No hay tratamiento activo para este paciente.</p>
              )}
            </div>
          )}

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

          {seccionAbierta === "estudios" && (
            <div className="seccion estudios">
              <h3>Estudios clínicos</h3>
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
                      </p>
                      {est.foliculos && (
                        <p>
                          <strong>Folículos:</strong> {est.foliculos}
                        </p>
                      )}
                      {est.ovarioDerecho && (
                        <p>
                          <strong>Ovario derecho:</strong> {est.ovarioDerecho}
                        </p>
                      )}
                      {est.ovarioIzquierdo && (
                        <p>
                          <strong>Ovario izquierdo:</strong> {est.ovarioIzquierdo}
                        </p>
                      )}
                      {est.estradiol && (
                        <p>
                          <strong>Estradiol:</strong> {est.estradiol}
                        </p>
                      )}
                      {est.progesterona && (
                        <p>
                          <strong>Progesterona:</strong> {est.progesterona}
                        </p>
                      )}
                      {est.lh && (
                        <p>
                          <strong>LH:</strong> {est.lh}
                        </p>
                      )}
                      {est.recuentoFolicular && (
                        <p>
                          <strong>Recuento folicular:</strong>{" "}
                          {est.recuentoFolicular}
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

          {mostrarModalInicio && (
            <div className="modal-inicio-tratamiento">
              <div className="modal-inicio-contenido">
                <h3>Iniciar tratamiento</h3>
                <p className="modal-subtitle">
                  Definí el tipo de tratamiento, fechas y medicación planificada.
                </p>

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
                          handleChangeNuevoTratamiento("fum", e.target.value)
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

                <div className="form-group meds-group">
                  <span className="label-inline">
                    Medicamentos planificados (opcionales)
                  </span>
                  <div className="meds-checks">
                    {MEDICAMENTOS_COMERCIALES.map((med) => (
                      <label key={med} className="med-check">
                        <input
                          type="checkbox"
                          checked={nuevoTratamiento.medicamentosPlanificados.includes(
                            med
                          )}
                          onChange={() => toggleMedicamentoPlanificado(med)}
                        />
                        <span>{med}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="modal-botones">
                  <button onClick={crearTratamiento}>Confirmar</button>
                  <button onClick={() => setMostrarModalInicio(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p>Cargando datos del paciente...</p>
      )}
    </div>
  );
};

export default PerfilPaciente;
