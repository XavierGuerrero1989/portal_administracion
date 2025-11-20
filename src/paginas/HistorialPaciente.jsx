import React, { useEffect, useState } from "react";
import "./HistorialPaciente.scss";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  FileText,
  Calendar,
  Bell,
  CheckCircle,
  XCircle,
  Edit2,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";

const eA = (fecha) => {
  if (!fecha) return new Date();
  if (fecha?.toDate) return fecha.toDate();
  if (fecha instanceof Date) return fecha;
  return new Date(fecha);
};

const formatearLabelCampo = (campo) => {
  const mapaEspecial = {
    fsh: "FSH",
    lh: "LH",
    estradiol: "Estradiol",
    e2: "Estradiol",
    ham: "HAM",
    amh: "AMH",
    progesterona: "Progesterona",
    recuentoFolicularTotal: "Recuento folicular total",
    ovarioDerecho: "Ovario derecho",
    ovarioIzquierdo: "Ovario izquierdo",
    tipoAnalisis: "Tipo de análisis",
    tipoEcografia: "Tipo de ecografía",
    subtipo: "Subtipo",
    tipoEstudio: "Tipo de estudio",
  };

  if (mapaEspecial[campo]) return mapaEspecial[campo];

  return campo
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const formatearTipoEstudio = (tipo) => {
  if (!tipo) return "Sin tipo";
  const t = String(tipo).toLowerCase();
  if (t === "analisis" || t === "análisis") return "Análisis";
  if (t === "ecografia" || t === "ecografía") return "Ecografía";
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
};

// Inicio de tratamiento: varios renglones y diagnóstico
const construirDescripcionInicio = (data) => {
  if (!data) return "Tratamiento iniciado";

  const lineas = [];

  if (data.tipoTratamiento || data.tipo) {
    lineas.push(
      `Tipo de tratamiento: ${data.tipoTratamiento || data.tipo}`
    );
  }

  if (data.diagnostico) {
    lineas.push(`Diagnóstico: ${data.diagnostico}`);
  }

  // Esquema nuevo: array de medicamentos planificados
  if (Array.isArray(data.medicamentosPlanificados)) {
    const meds = data.medicamentosPlanificados
      .map((m) => {
        if (!m) return null;
        const nombre = m.nombre || m.medicamento;
        const dosis = m.dosis;
        if (!nombre && !dosis) return null;
        return `${nombre || ""}${dosis ? ` ${dosis}` : ""}`.trim();
      })
      .filter(Boolean);

    if (meds.length > 0) {
      lineas.push(`Medicamentos: ${meds.join(" | ")}`);
    }
  } else {
    // Esquema viejo: fsh, hmg, antagonista, viaOral, etc.
    const posiblesClaves = ["fsh", "hmg", "antagonista", "viaOral", "via_oral"];
    posiblesClaves.forEach((clave) => {
      const bloque = data[clave];
      if (bloque && (bloque.medicamento || bloque.dosis)) {
        const label = clave.toUpperCase();
        const nombre = bloque.medicamento || "";
        const dosis = bloque.dosis || "";
        lineas.push(
          `${label}: ${[nombre, dosis].filter(Boolean).join(" ")} `.trim()
        );
      }
    });
  }

  if (lineas.length === 0) return "Tratamiento iniciado";
  return lineas.join("\n");
};

// Medicaciones: evento propio por cada droga (por ahora no se usa, queda para futuros ajustes)
const construirDescripcionMedicacion = (med) => {
  if (!med) return "Medicación asignada";

  const lineas = [];

  const nombre = med.nombre || med.medicamento;
  if (nombre) lineas.push(`Medicamento: ${nombre}`);

  if (med.dosis) lineas.push(`Dosis: ${med.dosis}`);

  const via = med.via || med.viaAplicacion;
  if (via) lineas.push(`Vía: ${via}`);

  if (med.frecuencia) lineas.push(`Frecuencia: ${med.frecuencia}`);

  const horario = med.hora || med.horario;
  if (horario) lineas.push(`Horario: ${horario}`);

  const fInicio = med.fechaInicio || med.fecha;
  const fFin = med.fechaFin;

  if (fInicio && !fFin) {
    lineas.push(`Desde: ${eA(fInicio).toLocaleDateString()}`);
  } else if (fInicio && fFin) {
    lineas.push(
      `Desde: ${eA(fInicio).toLocaleDateString()} hasta: ${eA(
        fFin
      ).toLocaleDateString()}`
    );
  }

  if (med.comentarios || med.notas) {
    lineas.push(`Comentarios: ${med.comentarios || med.notas}`);
  }

  if (lineas.length === 0) return "Medicación asignada";
  return lineas.join("\n");
};

// Estudios: muchos renglones, sin timestamps ni "Creado en"
const construirDescripcionEstudio = (data) => {
  if (!data) return "";

  const lineas = [];

  const tipo =
    formatearTipoEstudio(
      data.tipoEstudio || data.tipoGeneral || "Sin tipo"
    );
  const subtipo = data.tipoAnalisis || data.tipoEcografia || data.subtipo;

  if (tipo) lineas.push(`Tipo de estudio: ${tipo}`);
  if (subtipo) lineas.push(`Subtipo: ${subtipo}`);

  const camposExcluirBase = [
    "fecha",
    "usuarioId",
    "cargadoPor",
    "tipoEstudio",
    "tipoGeneral",
    "comentarios",
    "tipoAnalisis",
    "tipoEcografia",
    "subtipo",
    "createdAt",
    "updatedAt",
    "creadoEn",
    "createdEn",
    "creadoPor",
    "__id",
  ];

  const camposOrden = [
    "fsh",
    "lh",
    "estradiol",
    "e2",
    "ham",
    "amh",
    "progesterona",
    "recuentoFolicularTotal",
    "ovarioDerecho",
    "ovarioIzquierdo",
  ];

  const esTimestamp = (v) =>
    v && typeof v === "object" && "seconds" in v && "nanoseconds" in v;

  // Primero hormonas y recuentos
  camposOrden.forEach((campo) => {
    const valor = data[campo];
    if (
      valor !== undefined &&
      valor !== null &&
      valor !== "" &&
      !esTimestamp(valor)
    ) {
      lineas.push(`${formatearLabelCampo(campo)}: ${valor}`);
    }
  });

  // Luego otros campos
  Object.entries(data).forEach(([k, v]) => {
    if (
      camposExcluirBase.includes(k) ||
      camposOrden.includes(k) ||
      v === null ||
      v === "" ||
      esTimestamp(v)
    ) {
      return;
    }

    let valor = v;
    if (typeof v === "object") {
      try {
        valor = JSON.stringify(v);
      } catch {
        valor = String(v);
      }
    }

    lineas.push(`${formatearLabelCampo(k)}: ${valor}`);
  });

  if (data.comentarios) {
    lineas.push(`Comentarios: ${data.comentarios}`);
  }

  return lineas.join("\n");
};

// 🔔 Alertas (notificaciones) — ahora opcionalmente ligadas a un tratamiento
const construirEventoAlerta = (data, infoTratamiento) => {
  if (!data) return null;

  const ahora = new Date();
  const fechaProg = data.fechaHoraProgramada || data.fecha;
  if (!fechaProg) return null;

  const fechaJS = eA(fechaProg);

  let estadoAlerta;
  if (fechaJS > ahora) {
    // futura
    estadoAlerta = "Por confirmar";
  } else {
    // pasada
    if (data.confirmada === true) {
      estadoAlerta = "Confirmada";
    } else {
      estadoAlerta = "No confirmada";
    }
  }

  const partesDesc = [];

  if (data.medicamento) partesDesc.push(`Medicamento: ${data.medicamento}`);
  if (data.dosis) partesDesc.push(`Dosis: ${data.dosis}`);
  if (data.nivel || data.tipo) {
    const nivel = data.nivel || data.tipo;
    partesDesc.push(`Nivel: ${nivel}`);
  }
  if (data.diaTratamiento)
    partesDesc.push(`Día de tratamiento: ${data.diaTratamiento}`);

  const descripcion =
    partesDesc.length > 0
      ? partesDesc.join("\n")
      : "Recordatorio de medicación";

  return {
    tipo: "alerta",
    titulo: "Alerta de medicación",
    descripcion,
    fecha: fechaProg,
    autor: "Sistema",
    estadoAlerta,
    tratamientoId: data.tratamientoId || null,
    tratamientoLabel: infoTratamiento?.label || undefined,
  };
};

const HistorialPaciente = () => {
  const { id } = useParams();
  const [eventos, setEventos] = useState([]);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    const cargarHistorialGenerado = async () => {
      const historial = [];
      const tratamientosPorId = {}; // para linkear estudios/alertas al tratamiento

      const mapearDocs = (docs, tipo, construirEvento) => {
        docs.forEach((d) => {
          const data = d.data();
          const evento = construirEvento(data, tipo);
          if (evento && evento.fecha) {
            historial.push(evento);
          }
        });
      };

      // Citas (agendadas desde la app)
      try {
        const citasSnap = await getDocs(
          collection(db, "usuarios", id, "citas")
        );
        mapearDocs(citasSnap.docs, "cita", (data) => {
          const fechaBase =
            data.fecha || data.fechaHora || data.fechaCita || null;

          const partes = [];
          if (data.motivo) partes.push(`Motivo: ${data.motivo}`);
          if (data.hora) partes.push(`Hora: ${data.hora}`);
          if (data.estado) partes.push(`Estado: ${data.estado}`);

          const descripcion =
            partes.length > 0
              ? partes.join("\n")
              : "Cita médica agendada desde la app";

          return {
            tipo: "cita",
            titulo: "Cita médica",
            descripcion,
            fecha: fechaBase,
            autor:
              data.prof ||
              data.medicoNombre ||
              data.medico ||
              "Paciente / App",
          };
        });
      } catch (error) {
        console.warn("No se pudieron cargar las citas:", error);
      }

      // Tratamientos (inicio + finalización + estudios ligados)
      try {
        const tratamientosSnap = await getDocs(
          collection(db, "usuarios", id, "tratamientos")
        );

        for (const tDoc of tratamientosSnap.docs) {
          const data = tDoc.data();
          const tratamientoId = tDoc.id;
          const tipoTratamientoLabel =
            data.tipoTratamiento || data.tipo || "Tratamiento";

          // Guardamos info básica para usar luego con notificaciones
          tratamientosPorId[tratamientoId] = {
            label: tipoTratamientoLabel,
          };

          // Evento de inicio
          historial.push({
            tipo: "inicio",
            titulo: "Inicio de tratamiento",
            descripcion: construirDescripcionInicio(data),
            fecha:
              data.fechaInicio ||
              data.createdAt ||
              data.fecha ||
              new Date(),
            autor: data.medicoNombre || "Sistema",
            tratamientoId,
            tratamientoLabel: tipoTratamientoLabel,
          });

          // Evento de finalización (si corresponde)
          if (data.fechaFin) {
            const estado = data.estado;
            const esFinalizado =
              estado === "finalizado" ||
              estado === "Finalizado" ||
              !estado;

            if (esFinalizado) {
              const partesFin = [];

              if (data.tipoFinalizacion) {
                const t = String(data.tipoFinalizacion).toLowerCase();
                if (t === "puncion" || t === "punción") {
                  partesFin.push("Tipo de finalización: Punción");
                } else if (t === "cancelacion" || t === "cancelación") {
                  partesFin.push(
                    "Tipo de finalización: Cancelación de estímulo"
                  );
                } else {
                  partesFin.push(
                    `Tipo de finalización: ${data.tipoFinalizacion}`
                  );
                }
              }

              if (data.motivoCancelacion) {
                partesFin.push(`Motivo: ${data.motivoCancelacion}`);
              }

              if (data.comentarioFinalizacion) {
                partesFin.push(
                  `Comentarios: ${data.comentarioFinalizacion}`
                );
              }

              if (partesFin.length === 0) {
                partesFin.push("Tratamiento finalizado");
              }

              historial.push({
                tipo: "finalizacion",
                titulo: "Finalización de tratamiento",
                descripcion: partesFin.join("\n"),
                fecha: data.fechaFin,
                autor: data.medicoNombre || "Sistema",
                tratamientoId,
                tratamientoLabel: tipoTratamientoLabel,
              });
            }
          }

          // Estudios asociados a cada tratamiento (nuevo modelo: estudiosClinicos)
          try {
            const basePath = [
              "usuarios",
              id,
              "tratamientos",
              tratamientoId,
            ];

            // Primero intentamos con el modelo nuevo
            const estudiosClinicosRef = collection(
              db,
              ...basePath,
              "estudiosClinicos"
            );
            const estudiosClinicosSnap = await getDocs(estudiosClinicosRef);

            let snapAUsar = estudiosClinicosSnap;

            // Si no hay nada en estudiosClinicos, intentamos fallback a "estudios" (modelo viejo)
            if (estudiosClinicosSnap.empty) {
              const estudiosRef = collection(db, ...basePath, "estudios");
              const estudiosSnap = await getDocs(estudiosRef);
              snapAUsar = estudiosSnap;
            }

            snapAUsar.docs.forEach((dEst) => {
              const dataEst = dEst.data();
              const fechaEst =
                dataEst.fecha ||
                dataEst.createdAt ||
                dataEst.creadoEn ||
                null;

              if (!fechaEst) return;

              historial.push({
                tipo: "estudio",
                titulo: `Estudio: ${formatearTipoEstudio(
                  dataEst.tipoEstudio || dataEst.tipoGeneral || "Sin tipo"
                )}`,
                descripcion: construirDescripcionEstudio(dataEst),
                fecha: fechaEst,
                autor:
                  dataEst.cargadoPor ||
                  dataEst.creadoPor ||
                  "Paciente",
                tratamientoId,
                tratamientoLabel: tipoTratamientoLabel,
              });
            });
          } catch (error) {
            console.warn(
              `No se pudieron cargar los estudios del tratamiento ${tDoc.id}:`,
              error
            );
          }
        }

        // Compatibilidad MUY vieja: tratamientos/activo/estudios (solo si existiera)
        try {
          const activoRef = doc(db, "usuarios", id, "tratamientos", "activo");
          const activoSnap = await getDoc(activoRef);
          if (activoSnap.exists()) {
            const activoData = activoSnap.data();
            const tipoTratamientoLabel =
              activoData.tipoTratamiento ||
              activoData.tipo ||
              "Tratamiento activo";

            const estudiosSnap = await getDocs(
              collection(
                db,
                "usuarios",
                id,
                "tratamientos",
                "activo",
                "estudios"
              )
            );
            estudiosSnap.docs.forEach((dEst) => {
              const dataEst = dEst.data();
              const fechaEst =
                dataEst.fecha ||
                dataEst.createdAt ||
                dataEst.creadoEn ||
                null;
              if (!fechaEst) return;

              historial.push({
                tipo: "estudio",
                titulo: `Estudio: ${formatearTipoEstudio(
                  dataEst.tipoEstudio || dataEst.tipoGeneral || "Sin tipo"
                )}`,
                descripcion: construirDescripcionEstudio(dataEst),
                fecha: fechaEst,
                autor:
                  dataEst.cargadoPor ||
                  dataEst.creadoPor ||
                  "Paciente",
                tratamientoId: "activo",
                tratamientoLabel: tipoTratamientoLabel,
              });
            });
          }
        } catch (error) {
          console.warn(
            "No se pudieron cargar estudios del esquema viejo (activo/estudios):",
            error
          );
        }
      } catch (error) {
        console.warn("No se pudieron cargar los tratamientos o estudios:", error);
      }

      // Historial personalizado
      try {
        const historialSnap = await getDocs(
          collection(db, "usuarios", id, "historial")
        );
        mapearDocs(historialSnap.docs, "modificacion", (data) => ({
          tipo: data.tipo || "modificacion",
          titulo: data.titulo || "Modificación",
          descripcion: data.descripcion || "",
          fecha: data.fecha,
          autor: data.autor || "Sistema",
        }));
      } catch (error) {
        console.warn("No se pudo cargar la colección historial:", error);
      }

      // 🔔 Alertas (notificaciones) — ahora linkeadas a tratamientos si corresponde
      try {
        const notifSnap = await getDocs(
          collection(db, "usuarios", id, "notificaciones")
        );

        notifSnap.docs.forEach((d) => {
          const data = d.data();
          const infoTratamiento = data.tratamientoId
            ? tratamientosPorId[data.tratamientoId]
            : undefined;
          const evento = construirEventoAlerta(data, infoTratamiento);
          if (evento && evento.fecha) {
            historial.push(evento);
          }
        });
      } catch (error) {
        console.warn("No se pudieron cargar las notificaciones/alertas:", error);
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
      case "inicio":
        return <Calendar />;
      case "medicacion":
        return <Bell />;
      case "estudio":
        return <FileText />;
      case "cita":
        return <Calendar />;
      case "modificacion":
        return <Edit2 />;
      case "finalizacion":
        return <CheckCircle />;
      case "alerta":
        return <XCircle />;
      default:
        return <FileText />;
    }
  };

  const exportarPDF = () => {
    const docPDF = new jsPDF();
    docPDF.text("Historial del Paciente", 14, 16);

    const rows = eventosFiltrados.map((e) => [
      eA(e.fecha).toLocaleString(),
      e.tipo,
      e.titulo,
      e.descripcion,
      e.autor || "-",
    ]);

    docPDF.autoTable({
      head: [["Fecha", "Tipo", "Título", "Descripción", "Autor"]],
      body: rows,
      startY: 20,
      styles: { fontSize: 9 },
    });

    docPDF.save("historial_paciente.pdf");
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
        <button
          className={filtro === "todos" ? "activo" : ""}
          onClick={() => setFiltro("todos")}
        >
          Todos
        </button>
        <button
          className={filtro === "inicio" ? "activo" : ""}
          onClick={() => setFiltro("inicio")}
        >
          Inicio
        </button>
        <button
          className={filtro === "medicacion" ? "activo" : ""}
          onClick={() => setFiltro("medicacion")}
        >
          Medicaciones
        </button>
        <button
          className={filtro === "estudio" ? "activo" : ""}
          onClick={() => setFiltro("estudio")}
        >
          Estudios
        </button>
        <button
          className={filtro === "cita" ? "activo" : ""}
          onClick={() => setFiltro("cita")}
        >
          Citas
        </button>
        <button
          className={filtro === "modificacion" ? "activo" : ""}
          onClick={() => setFiltro("modificacion")}
        >
          Modificaciones
        </button>
        <button
          className={filtro === "finalizacion" ? "activo" : ""}
          onClick={() => setFiltro("finalizacion")}
        >
          Finalización
        </button>
        <button
          className={filtro === "alerta" ? "activo" : ""}
          onClick={() => setFiltro("alerta")}
        >
          Alertas
        </button>
      </div>

      <div className="timeline">
        {eventosFiltrados.length === 0 ? (
          <p className="sin-eventos">No hay eventos para mostrar.</p>
        ) : (
          eventosFiltrados.map((evento, i) => (
            <div className={`evento ${evento.tipo}`} key={i}>
              <div className="icono">{renderIcono(evento.tipo)}</div>
              <div className="contenido">
                <p className="fecha">{eA(evento.fecha).toLocaleString()}</p>
                <h4>{evento.titulo}</h4>

                {evento.tratamientoLabel && (
                  <p className="tag-tratamiento">
                    Tratamiento: {evento.tratamientoLabel}
                  </p>
                )}

                {evento.descripcion &&
                  evento.descripcion.split("\n").map((linea, idx) => (
                    <p key={idx} className="descripcion">
                      {linea}
                    </p>
                  ))}

                {evento.estadoAlerta && (
                  <p className="estado-alerta">
                    Estado: {evento.estadoAlerta}
                  </p>
                )}

                {evento.extra && <div className="extra">{evento.extra}</div>}
                {evento.autor && (
                  <p className="autor">Registrado por: {evento.autor}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistorialPaciente;
