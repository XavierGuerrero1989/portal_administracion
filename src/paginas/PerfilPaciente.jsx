import "./PerfilPaciente.scss";
import React, { useEffect, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from "react-router-dom";

const PerfilPaciente = () => {
  const { id } = useParams();
  const [paciente, setPaciente] = useState(null);
  const [datosEditados, setDatosEditados] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [tratamientoActivo, setTratamientoActivo] = useState(null);
  const [evoluciones, setEvoluciones] = useState([]);
  const [nuevaEvolucion, setNuevaEvolucion] = useState("");
  const [seccionAbierta, setSeccionAbierta] = useState(null);

  const ordenCampos = [
  "nombre",
  "apellido",
  "telefono",
  "fechaNacimiento",
  "grupoSanguineo",
  "altura",
  "peso",
  "pareja",
  "nombrePareja",
  "ciclosRegulares",
  "duracionCiclo",
  "embarazosPrevios",
  "cantidadEmbarazos",
  "hijos",
  "cantidadHijos",
  "patologias",
  "tieneAlergias",
  "detalleAlergias",
  "procedimientos",
  "detalleProcedimientos"
];


  // Función para formatear fechas
  const formatFecha = (f) => {
    if (!f) return "-";
    if (typeof f === "string") return new Date(f).toLocaleDateString("es-AR");
    if (f.toDate) return f.toDate().toLocaleDateString("es-AR");
    if (f.seconds) return new Date(f.seconds * 1000).toLocaleDateString("es-AR");
    return "-";
  };

  useEffect(() => {
    const obtenerDatos = async () => {
      const docRef = doc(db, "usuarios", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const datos = docSnap.data();
        Object.keys(datos).forEach(key => {
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

    const q = query(collection(db, `usuarios/${id}/evoluciones`), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const evolList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

  const handleToggle = (seccion) => {
    if (seccionAbierta === seccion) {
      setSeccionAbierta(null);
    } else {
      setSeccionAbierta(seccion);
    }
  };

  return (
    <div className="perfil-paciente">
      {paciente?.error ? (
        <p>No se encontró el paciente.</p>
      ) : paciente ? (
        <>
          <div className="perfil-header">
            <h2>{paciente.nombre} {paciente.apellido}</h2>
            <p><strong>Email:</strong> {paciente.email}</p>
            <p><strong>Estado:</strong> {tratamientoActivo ? "Tratamiento Activo" : "Sin tratamiento activo"}</p>
            
          </div>

          <div className="cards-container">
            <div className="card" onClick={() => handleToggle("datos")}>📋 Datos Clínicos</div>
            <div className="card" onClick={() => handleToggle("tratamiento")}>💊 Tratamientos</div>
            <div className="card" onClick={() => handleToggle("evolucion")}>📈 Evolución Diaria</div>
            <div className="card" onClick={() => handleToggle("estudios")}>🧪 Estudios</div>
          </div>

          {seccionAbierta === "datos" && (
            <div className="seccion">
              <h3>Datos Clínicos</h3>
              <button className="editar" onClick={() => setModoEdicion(!modoEdicion)}>
              {modoEdicion ? "Cancelar edición" : "Editar paciente"}
            </button>
              {ordenCampos.map((key) => (
  <p key={key}><strong>{key}:</strong> {modoEdicion ? (
    <input value={datosEditados[key] || ""} onChange={(e) => setDatosEditados({ ...datosEditados, [key]: e.target.value })} />
  ) : (
    paciente[key] || "-"
  )}</p>
))}

              {modoEdicion && (
                <button onClick={() => setMostrarModal(true)}>Guardar cambios</button>
              )}
            </div>
          )}

          {seccionAbierta === "tratamiento" && (
            <div className="seccion">
              <h3>Tratamiento</h3>
              {tratamientoActivo ? (
                <>
                  <p><strong>FUM:</strong> {tratamientoActivo.fum ? new Date(tratamientoActivo.fum.toDate ? tratamientoActivo.fum.toDate() : tratamientoActivo.fum).toLocaleDateString() : "-"}</p>
                  <p><strong>Tipo:</strong> {tratamientoActivo.tipo}</p>
                  <p><strong>Inicio:</strong> {tratamientoActivo.fechaInicio ? new Date(tratamientoActivo.fechaInicio.toDate ? tratamientoActivo.fechaInicio.toDate() : tratamientoActivo.fechaInicio).toLocaleDateString() : "-"}</p>

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
                              <p><strong>Nombre:</strong> {med.medicamento}</p>
                              <p><strong>Dosis:</strong> {med.dosis}</p>
                              <p><strong>Hora:</strong> {med.hora}</p>
                              <p><strong>Días:</strong> {typeof med.duracion === "number" ? med.duracion : "-"}</p>

                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ marginTop: "20px" }}>
                    <button onClick={() => window.location.href = `/detalle-tratamiento/${id}/activo`}>
                      Ver detalle completo
                    </button>
                  </div>
                </>
              ) : <p>No hay tratamiento activo</p>}
            </div>
          )}


          {seccionAbierta === "evolucion" && (
            <div className="seccion">
              <h3>Evolución Diaria</h3>
              {evoluciones.length > 0 ? (
                evoluciones.map((evo) => (
                  <div key={evo.id}>
                    <p><strong>{formatFecha(evo.fecha)}:</strong> {evo.texto}</p>
                  </div>
                ))
              ) : (
                <p>No hay evoluciones registradas</p>
              )}
              <textarea placeholder="Nueva evolución..." value={nuevaEvolucion} onChange={(e) => setNuevaEvolucion(e.target.value)} />
              <button onClick={guardarEvolucion}>Guardar evolución</button>
            </div>
          )}

          {seccionAbierta === "estudios" && (
            <div className="seccion">
              <h3>Estudios</h3>
              <p>Futuro módulo de estudios aquí.</p>
            </div>
          )}

          {mostrarModal && (
            <div className="modal-confirmacion">
              <div className="modal-contenido">
                <p>¿Desea guardar los cambios realizados?</p>
                <div className="modal-botones">
                  <button onClick={guardarCambios}>Confirmar</button>
                  <button onClick={() => setMostrarModal(false)}>Cancelar</button>
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
