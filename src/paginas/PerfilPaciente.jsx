// PerfilPaciente.jsx

import "./PerfilPaciente.scss";

import React, { useEffect, useState, button } from "react";
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
} from "firebase/firestore";

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
  const [notificaciones, setNotificaciones] = useState([]);
  const [nuevaEvolucion, setNuevaEvolucion] = useState("");

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

        const notifRef = collection(db, `usuarios/${id}/notificaciones`);
        const notifSnap = await getDocs(notifRef);
        const lista = notifSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((n) => n.tipo === "primaria");
        setNotificaciones(lista);
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

  const renderCampo = (label, key) => (
  <p>
    <strong>{label}:</strong>{" "}
    {modoEdicion ? (
      <input
        value={datosEditados[key] || ""}
        onChange={(e) =>
          setDatosEditados({ ...datosEditados, [key]: e.target.value })
        }
      />
    ) : (
      paciente[key] || "-"
    )}
  </p>
);

const formatFecha = (f) => {
  if (!f) return "-";
  if (typeof f === "string") return new Date(f).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return f.toDate
    ? f.toDate().toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date(f).toLocaleDateString("es-AR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
};

const renderConfirmaciones = (medicamento) => {
  const confirmaciones = notificaciones
    .filter((n) => n.medicamento === medicamento)
    .sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaA - fechaB;
    });

  if (confirmaciones.length === 0)
    return <p className="sin-confirmaciones">No hay confirmaciones registradas.</p>;

  return (
    <ul className="lista-confirmaciones">
      {confirmaciones.map((n) => (
        <li key={n.id}>
          📅 {formatFecha(n.fecha)} - 🕒 {n.horaProgramada} -{" "}
          {n.confirmada
            ? `✅ Confirmado${n.confirmadaEn
                ? ` a las ${new Date(n.confirmadaEn).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}`
            : "❌ No confirmado"}
        </li>
      ))}
    </ul>
  );
};


  return (
  <div className="perfil-paciente">
    {paciente?.error ? (
      <p>No se encontró el paciente.</p>
    ) : paciente ? (
      <>
        <h2>{paciente.nombre} {paciente.apellido}</h2>

        <div className="barra-estado">
          <div className="estado-detalle">
            <span className={`badge ${tratamientoActivo ? 'activo' : 'inactivo'}`}>
              {tratamientoActivo ? 'TRATAMIENTO ACTIVO' : 'SIN TRATAMIENTO'}
            </span>
            <span><strong>FUM:</strong> {tratamientoActivo?.fum ? formatFecha(tratamientoActivo.fum) : paciente.fum ? formatFecha(paciente.fum) : "-"}</span>
            <span><strong>Tratamiento:</strong> {tratamientoActivo?.tipo || "-"}</span>
            <span><strong>Email:</strong> {paciente.email}</span>
          </div>
          <div className="estado-acciones">
            <button className="editar" onClick={() => setModoEdicion(!modoEdicion)}>
              {modoEdicion ? "Cancelar" : "Editar paciente"}
            </button>
            <button className="iniciar">Iniciar tratamiento</button>
            <button className="finalizar">Finalizar tratamiento</button>
          </div>
        </div>

        <div className="layout-principal">
          <div className="info-personal">
            <h3>Resumen de datos Clínicos</h3>
            {renderCampo("Teléfono", "telefono")}
            {renderCampo("Fecha de nacimiento", "fechaNacimiento")}
            {renderCampo("Grupo sanguíneo", "grupoSanguineo")}
            {renderCampo("Altura", "altura")}
            {renderCampo("Peso", "peso")}
            {renderCampo("Estado civil / pareja", "pareja")}
            {renderCampo("Nombre de pareja", "nombrePareja")}
            {renderCampo("Ciclos regulares", "ciclosRegulares")}
            {renderCampo("Duración ciclo", "duracionCiclo")}
            {renderCampo("Embarazos previos", "embarazosPrevios")}
            {renderCampo("Cantidad de embarazos", "cantidadEmbarazos")}
            {renderCampo("Hijos", "hijos")}
            {renderCampo("Cantidad de hijos", "cantidadHijos")}
            {renderCampo("Patologías", "patologias")}
            {renderCampo("Alergias", "tieneAlergias")}
            {renderCampo("Detalle alergias", "detalleAlergias")}
            {renderCampo("Procedimientos", "procedimientos")}
            {renderCampo("Detalle procedimientos", "detalleProcedimientos")}

            {modoEdicion && (
              <button className="guardar" onClick={() => setMostrarModal(true)}>
                Guardar cambios
              </button>
            )}
          </div>

          <div className="columna-evolucion">
            <h3>Evolución Diaria</h3>
            <div className="evoluciones-anteriores">
              {evoluciones.length > 0 ? (
                evoluciones.map((evo) => (
                  <div key={evo.id} className="evolucion-item">
                    <span className="fecha">{new Date(evo.fecha.seconds * 1000).toLocaleDateString()}</span>
                    <p className="texto">{evo.texto}</p>
                  </div>
                ))
              ) : (
                <p>No hay evoluciones previas.</p>
              )}
            </div>
            <div className="nueva-evolucion">
              <textarea
                placeholder="Escriba una nueva evolución..."
                value={nuevaEvolucion}
                onChange={(e) => setNuevaEvolucion(e.target.value)}
              />
              <button onClick={guardarEvolucion}>Guardar evolución</button>
            </div>
          </div>
        </div>

        <div className="seccion-tratamientos">
          <h3>Datos del tratamiento</h3>
          <br/>
          {tratamientoActivo ? (
            <>
              <p><strong>Fecha de inicio:</strong> {formatFecha(tratamientoActivo.fechaInicio)}</p>
              <br/>

              <div className="bloque-medicacion">
                <p><strong>FSH:</strong> {tratamientoActivo.fsh?.medicamento} - {tratamientoActivo.fsh?.dosis} - {tratamientoActivo.fsh?.hora}</p>
                {renderConfirmaciones(tratamientoActivo.fsh?.medicamento)}
                <br/>
              </div>

              <div className="bloque-medicacion">
                <p><strong>HMG:</strong> {tratamientoActivo.hmg?.medicamento} - {tratamientoActivo.hmg?.dosis} - {tratamientoActivo.hmg?.hora}</p>
                {renderConfirmaciones(tratamientoActivo.hmg?.medicamento)}
                <br/>
              </div>

              <div className="bloque-medicacion">
                <p><strong>Vía Oral:</strong> {tratamientoActivo.viaOral?.medicamento} - {tratamientoActivo.viaOral?.dosis} - {tratamientoActivo.viaOral?.hora}</p>
                {renderConfirmaciones(tratamientoActivo.viaOral?.medicamento)}
                <br/>
              </div>
            </>
          ) : (
            <p>No hay tratamiento activo.</p>
          )}
        </div>

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
