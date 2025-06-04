import React, { useEffect, useState } from "react";
import "./HistorialPaciente.scss";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FileText, Calendar, Bell, CheckCircle, XCircle, Edit2, Download } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";


const HistorialPaciente = () => {
  const { id } = useParams();
  const [eventos, setEventos] = useState([]);
  const [filtro, setFiltro] = useState("todos");

  const eA = (fecha) => {
    if (fecha?.toDate) return fecha.toDate();
    if (fecha instanceof Date) return fecha;
    return new Date(fecha);
  };

  useEffect(() => {
    const cargarHistorialGenerado = async () => {
      const historial = [];

      const mapearDocs = (docs, tipo, construirEvento) => {
        docs.forEach((doc) => {
          historial.push(construirEvento(doc.data(), tipo));
        });
      };

      // Citas (si existen)
      try {
        const citasSnap = await getDocs(collection(db, "usuarios", id, "citas"));
        mapearDocs(citasSnap.docs, "cita", (data) => ({
          tipo: "cita",
          titulo: "Cita médica",
          descripcion: data.motivo,
          fecha: data.fecha,
          autor: data.prof ? `Dr. ${data.prof}` : null,
        }));
      } catch (error) {
        console.warn("No se pudieron cargar las citas:", error);
      }

      // Tratamiento activo
      try {
        const activoRef = doc(db, "usuarios", id, "tratamientos", "activo");
        const activoSnap = await getDoc(activoRef);

        if (activoSnap.exists()) {
          const activoData = activoSnap.data();
          historial.push({
            tipo: "inicio",
            titulo: `Inicio de tratamiento`,
            descripcion: `FSH: ${activoData.fsh?.medicamento || ""} ${activoData.fsh?.dosis || ""} - HMG: ${activoData.hmg?.medicamento || ""} ${activoData.hmg?.dosis || ""}`,
            fecha: activoData.fechaInicio,
            autor: "Sistema",
          });

          // Estudios dentro de tratamientos/activo/estudios
          const estudiosSnap = await getDocs(collection(db, "usuarios", id, "tratamientos", "activo", "estudios"));
          mapearDocs(estudiosSnap.docs, "estudio", (data) => {
            console.log("📦 Estudio recibido:", data);
            return {
              tipo: "estudio",
              titulo: `Estudio: ${data.tipoEstudio || "Sin tipo"}`,
              descripcion: `Valores: ${Object.entries(data)
                .filter(([k]) => !["fecha", "tipoEstudio", "usuarioId", "cargadoPor"].includes(k))
                .map(([k, v]) => `${k}: ${v}`)
                .join(" | ")}`,
              fecha: data.fecha,
              autor: data.cargadoPor || "Paciente",
            };
          });
        }
      } catch (error) {
        console.warn("No se pudieron cargar los tratamientos o estudios:", error);
      }

      const eventosOrdenados = historial
        .filter((e) => e.fecha)
        .sort((a, b) => eA(b.fecha) - eA(a.fecha));

      setEventos(eventosOrdenados);
    };

    cargarHistorialGenerado();
  }, [id]);

  const eventosFiltrados =
    filtro === "todos" ? eventos : eventos.filter((e) => e.tipo === filtro);

  const renderIcono = (tipo) => {
    switch (tipo) {
      case "inicio": return <Calendar />;
      case "medicacion": return <Bell />;
      case "estudio": return <FileText />;
      case "cita": return <Calendar />;
      case "modificacion": return <Edit2 />;
      case "finalizacion": return <CheckCircle />;
      case "alerta": return <XCircle />;
      default: return <FileText />;
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Historial del Paciente", 14, 16);

    const rows = eventosFiltrados.map((e) => [
      eA(e.fecha).toLocaleString(),
      e.tipo,
      e.titulo,
      e.descripcion,
      e.autor || "-"
    ]);

    doc.autoTable({
      head: [["Fecha", "Tipo", "Título", "Descripción", "Autor"]],
      body: rows,
      startY: 20,
      styles: { fontSize: 9 }
    });

    doc.save("historial_paciente.pdf");
  };

  return (
    <div className="historial-paciente">
      <div className="cabecera">
        <h2>Historial del Paciente</h2>
        <button className="btn-pdf" onClick={exportarPDF} title="Descargar PDF">
          <Download size={18} /> Descargar PDF
        </button>
      </div>

      <div className="filtros">
        <button onClick={() => setFiltro("todos")}>Todos</button>
        <button onClick={() => setFiltro("inicio")}>Inicio</button>
        <button onClick={() => setFiltro("medicacion")}>Medicaciones</button>
        <button onClick={() => setFiltro("estudio")}>Estudios</button>
        <button onClick={() => setFiltro("cita")}>Citas</button>
        <button onClick={() => setFiltro("modificacion")}>Modificaciones</button>
        <button onClick={() => setFiltro("finalizacion")}>Finalización</button>
        <button onClick={() => setFiltro("alerta")}>Alertas</button>
      </div>

      <div className="timeline">
        {eventosFiltrados.length === 0 ? (
          <p>No hay eventos para mostrar.</p>
        ) : (
          eventosFiltrados.map((evento, i) => (
            <div className={`evento ${evento.tipo}`} key={i}>
              <div className="icono">{renderIcono(evento.tipo)}</div>
              <div className="contenido">
                <p className="fecha">{eA(evento.fecha).toLocaleString()}</p>
                <h4>{evento.titulo}</h4>
                <p>{evento.descripcion}</p>
                {evento.extra && <div className="extra">{evento.extra}</div>}
                {evento.autor && <p className="autor">Registrado por: {evento.autor}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorialPaciente;
