import "./Dashboard.scss";

import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  ClipboardPlus,
  Clock3,
  FileWarning,
  Pill,
  Plus,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs } from "firebase/firestore";

import Loader from "../componentes/Loader";
import { db } from "../firebase";
import { normalizeRole, parseLocalDate } from "../utils/domain";
import { useNavigate } from "react-router-dom";

const parseFecha = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (typeof valor?.toDate === "function") return valor.toDate();
  if (typeof valor?.seconds === "number") return new Date(valor.seconds * 1000);
  return parseLocalDate(valor);
};

const inicioDelDia = (fecha = new Date()) => {
  const resultado = new Date(fecha);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
};

const finDelDia = (fecha = new Date()) => {
  const resultado = new Date(fecha);
  resultado.setHours(23, 59, 59, 999);
  return resultado;
};

const nombrePaciente = (paciente) =>
  `${paciente.nombre || ""} ${paciente.apellido || ""}`.trim() ||
  "Paciente sin nombre";

const estaCancelada = (item) => {
  const estado = String(item.estado || "").toLowerCase();
  return item.cancelada === true || estado.includes("cancelad");
};

const estaConfirmada = (item) => {
  const estado = String(item.estado || "").toLowerCase();
  return item.confirmada === true || estado === "confirmado" || estado === "confirmada";
};

const obtenerEstudiosPendientes = (tratamiento) => {
  const fuentes = [
    tratamiento.estudiosPendientes,
    tratamiento.estudiosSolicitados,
    tratamiento.estudiosClinicos,
  ];

  return fuentes
    .flatMap((fuente) => (Array.isArray(fuente) ? fuente : []))
    .filter((estudio) => {
      if (!estudio || typeof estudio !== "object") return false;
      const estado = String(estudio.estado || "").toLowerCase();
      const fechaLimite = parseFecha(
        estudio.fechaVencimiento || estudio.vencimiento || estudio.fechaLimite
      );
      return estado === "pendiente" || estado === "vencido" || Boolean(fechaLimite);
    });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState({
    turnosHoy: [],
    tratamientosActivos: [],
    pacientesNuevas: [],
    medicacionesSinConfirmar: [],
    estudiosPendientes: [],
    seguimientos: [],
  });

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const pacientes = usuariosSnapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => normalizeRole(item) === "paciente");

        const ahora = new Date();
        const hoyInicio = inicioDelDia(ahora);
        const hoyFin = finDelDia(ahora);
        const haceSieteDias = new Date(hoyInicio);
        haceSieteDias.setDate(haceSieteDias.getDate() - 7);

        const turnosHoy = [];
        const tratamientosActivos = [];
        const medicacionesSinConfirmar = [];
        const estudiosPendientes = [];
        const seguimientos = [];

        await Promise.all(
          pacientes.map(async (paciente) => {
            const usuarioRef = doc(db, "usuarios", paciente.id);
            const [turnosSnapshot, tratamientosSnapshot, notificacionesSnapshot] =
              await Promise.all([
                getDocs(collection(usuarioRef, "citas")),
                getDocs(collection(usuarioRef, "tratamientos")),
                getDocs(collection(usuarioRef, "notificaciones")),
              ]);

            const turnosVigentes = turnosSnapshot.docs
              .map((item) => ({ id: item.id, ...item.data() }))
              .filter((turno) => !estaCancelada(turno))
              .map((turno) => ({ ...turno, fechaNormalizada: parseFecha(turno.fecha) }))
              .filter((turno) => turno.fechaNormalizada);

            turnosVigentes.forEach((turno) => {
              if (
                turno.fechaNormalizada >= hoyInicio &&
                turno.fechaNormalizada <= hoyFin
              ) {
                turnosHoy.push({
                  ...turno,
                  pacienteId: paciente.id,
                  paciente: nombrePaciente(paciente),
                });
              }
            });

            const tieneProximoTurno = turnosVigentes.some(
              (turno) => turno.fechaNormalizada > hoyFin
            );

            tratamientosSnapshot.docs.forEach((item) => {
              const tratamiento = item.data();
              const estado = String(tratamiento.estado || "").toLowerCase();
              const esActivo = estado === "activo" || (!estado && item.id === "activo");
              if (!esActivo) return;

              const tratamientoNormalizado = {
                ...tratamiento,
                pacienteId: paciente.id,
                tratamientoId: item.id,
                paciente: nombrePaciente(paciente),
                tipo: tratamiento.tipoTratamiento || tratamiento.tipo || "Tratamiento",
                fechaInicio: parseFecha(tratamiento.fechaInicio || tratamiento.creadoEn),
              };
              tratamientosActivos.push(tratamientoNormalizado);

              obtenerEstudiosPendientes(tratamiento).forEach((estudio, index) => {
                const fechaLimite = parseFecha(
                  estudio.fechaVencimiento || estudio.vencimiento || estudio.fechaLimite
                );
                const estado = String(estudio.estado || "pendiente").toLowerCase();
                estudiosPendientes.push({
                  ...estudio,
                  id: `${item.id}-${index}`,
                  pacienteId: paciente.id,
                  tratamientoId: item.id,
                  paciente: nombrePaciente(paciente),
                  fechaLimite,
                  vencido: estado === "vencido" || Boolean(fechaLimite && fechaLimite < hoyInicio),
                });
              });

              if (!tieneProximoTurno) {
                seguimientos.push({
                  pacienteId: paciente.id,
                  tratamientoId: item.id,
                  paciente: nombrePaciente(paciente),
                  motivo: "Tratamiento activo sin próximo turno programado",
                });
              }
            });

            notificacionesSnapshot.docs.forEach((item) => {
              const notificacion = item.data();
              const fecha = parseFecha(
                notificacion.fechaHoraProgramada || notificacion.fecha
              );
              if (
                !fecha ||
                fecha > ahora ||
                fecha < haceSieteDias ||
                estaCancelada(notificacion) ||
                estaConfirmada(notificacion)
              ) {
                return;
              }

              medicacionesSinConfirmar.push({
                ...notificacion,
                id: item.id,
                pacienteId: paciente.id,
                paciente: nombrePaciente(paciente),
                fecha,
              });
            });
          })
        );

        turnosHoy.sort((a, b) =>
          `${a.hora || "99:99"}`.localeCompare(`${b.hora || "99:99"}`)
        );
        tratamientosActivos.sort(
          (a, b) => (b.fechaInicio?.getTime() || 0) - (a.fechaInicio?.getTime() || 0)
        );
        medicacionesSinConfirmar.sort((a, b) => b.fecha - a.fecha);
        estudiosPendientes.sort((a, b) => Number(b.vencido) - Number(a.vencido));

        const pacientesNuevas = pacientes
          .map((paciente) => ({
            ...paciente,
            fechaAlta: parseFecha(
              paciente.createdAt || paciente.creadoEn || paciente.fechaRegistro
            ),
          }))
          .filter(
            (paciente) =>
              paciente.fechaAlta &&
              paciente.fechaAlta >= haceSieteDias &&
              paciente.fechaAlta <= ahora
          )
          .sort((a, b) => b.fechaAlta - a.fechaAlta);

        setDatos({
          turnosHoy,
          tratamientosActivos,
          pacientesNuevas,
          medicacionesSinConfirmar,
          estudiosPendientes,
          seguimientos,
        });
      } catch (err) {
        console.error("Error cargando dashboard operativo:", err);
        setError("No se pudo cargar toda la información operativa. Intentá nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    cargarDashboard();
  }, []);

  const tareas = useMemo(() => {
    const medicaciones = datos.medicacionesSinConfirmar.map((item) => ({
      id: `med-${item.pacienteId}-${item.id}`,
      prioridad: "alta",
      tipo: "Medicación",
      titulo: `${item.paciente} no confirmó ${item.medicamento || "una medicación"}`,
      detalle: item.fecha.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      onClick: () => navigate(`/pacientes/${item.pacienteId}/historial`),
    }));

    const estudios = datos.estudiosPendientes.map((item) => ({
      id: `est-${item.pacienteId}-${item.id}`,
      prioridad: item.vencido ? "alta" : "media",
      tipo: item.vencido ? "Estudio vencido" : "Estudio pendiente",
      titulo: `${item.paciente} · ${item.tipoEstudio || item.nombre || "Estudio"}`,
      detalle: item.fechaLimite
        ? `Fecha límite ${item.fechaLimite.toLocaleDateString("es-AR")}`
        : "Pendiente de completar",
      onClick: () =>
        navigate(`/tratamientos/${item.pacienteId}/${item.tratamientoId}`),
    }));

    const seguimientos = datos.seguimientos.map((item) => ({
      id: `seg-${item.pacienteId}-${item.tratamientoId}`,
      prioridad: "media",
      tipo: "Seguimiento",
      titulo: item.paciente,
      detalle: item.motivo,
      onClick: () =>
        navigate(`/tratamientos/${item.pacienteId}/${item.tratamientoId}`),
    }));

    return [...medicaciones, ...estudios, ...seguimientos];
  }, [datos, navigate]);

  if (loading) return <Loader />;

  return (
    <main className="dashboard-operativo">
      <header className="dashboard-hero">
        <div>
          <span className="dashboard-eyebrow">Panel del día</span>
          <h1>¿Qué requiere atención hoy?</h1>
          <p>
            {new Date().toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <div className="dashboard-quick-actions" aria-label="Accesos rápidos">
          <button onClick={() => navigate("/pacientes/nuevo")}>
            <UserPlus size={18} /> Nueva paciente
          </button>
          <button onClick={() => navigate("/turnos")}>
            <CalendarDays size={18} /> Agendar turno
          </button>
          <button onClick={() => navigate("/pacientes")}>
            <ClipboardPlus size={18} /> Iniciar tratamiento
          </button>
        </div>
      </header>

      {error && <div className="dashboard-error">{error}</div>}

      <section className="dashboard-kpis" aria-label="Resumen operativo">
        <button className="kpi-card kpi-cyan" onClick={() => navigate("/turnos")}>
          <span className="kpi-icon"><CalendarDays size={20} /></span>
          <span className="kpi-value">{datos.turnosHoy.length}</span>
          <span className="kpi-label">Turnos de hoy</span>
          <ChevronRight size={18} />
        </button>
        <button className="kpi-card kpi-violet" onClick={() => navigate("/tratamientos")}>
          <span className="kpi-icon"><Activity size={20} /></span>
          <span className="kpi-value">{datos.tratamientosActivos.length}</span>
          <span className="kpi-label">Tratamientos activos</span>
          <ChevronRight size={18} />
        </button>
        <button className="kpi-card kpi-soft" onClick={() => navigate("/pacientes")}>
          <span className="kpi-icon"><Users size={20} /></span>
          <span className="kpi-value">{datos.pacientesNuevas.length}</span>
          <span className="kpi-label">Nuevas pacientes · 7 días</span>
          <ChevronRight size={18} />
        </button>
        <button className="kpi-card kpi-warning" onClick={() => document.getElementById("pendientes")?.scrollIntoView({ behavior: "smooth" })}>
          <span className="kpi-icon"><AlertTriangle size={20} /></span>
          <span className="kpi-value">{tareas.length}</span>
          <span className="kpi-label">Tareas pendientes</span>
          <ChevronRight size={18} />
        </button>
      </section>

      <div className="dashboard-columns">
        <section className="dashboard-panel agenda-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Agenda</span>
              <h2>Turnos de hoy</h2>
            </div>
            <button className="panel-link" onClick={() => navigate("/turnos")}>Ver agenda</button>
          </div>
          {datos.turnosHoy.length === 0 ? (
            <div className="empty-state">
              <CalendarDays size={28} />
              <strong>No hay turnos programados para hoy</strong>
              <span>Podés crear uno desde “Agendar turno”.</span>
            </div>
          ) : (
            <div className="agenda-list">
              {datos.turnosHoy.map((turno) => (
                <button
                  className="agenda-item"
                  key={`${turno.pacienteId}-${turno.id}`}
                  onClick={() => navigate(`/pacientes/${turno.pacienteId}/perfil`)}
                >
                  <span className="agenda-time">{turno.hora || "Sin hora"}</span>
                  <span className="agenda-info">
                    <strong>{turno.paciente}</strong>
                    <small>{turno.motivo || "Consulta"}</small>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-panel" id="pendientes">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Prioridades</span>
              <h2>Alertas y tareas pendientes</h2>
            </div>
            <span className="panel-count">{tareas.length}</span>
          </div>
          {tareas.length === 0 ? (
            <div className="empty-state success">
              <Stethoscope size={28} />
              <strong>No hay pendientes detectados</strong>
              <span>La información operativa está al día.</span>
            </div>
          ) : (
            <div className="task-list">
              {tareas.slice(0, 8).map((tarea) => (
                <button className="task-item" key={tarea.id} onClick={tarea.onClick}>
                  <span className={`priority-dot ${tarea.prioridad}`} />
                  <span className="task-info">
                    <small>{tarea.tipo}</small>
                    <strong>{tarea.titulo}</strong>
                    <span>{tarea.detalle}</span>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))}
              {tareas.length > 8 && (
                <p className="task-overflow">Hay {tareas.length - 8} tareas adicionales.</p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="dashboard-panel treatments-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">En curso</span>
            <h2>Tratamientos activos</h2>
          </div>
          <button className="panel-link" onClick={() => navigate("/tratamientos")}>Ver todos</button>
        </div>
        {datos.tratamientosActivos.length === 0 ? (
          <div className="empty-state compact">
            <Activity size={26} />
            <strong>No hay tratamientos activos</strong>
          </div>
        ) : (
          <div className="treatment-grid">
            {datos.tratamientosActivos.slice(0, 6).map((tratamiento) => (
              <button
                className="treatment-card"
                key={`${tratamiento.pacienteId}-${tratamiento.tratamientoId}`}
                onClick={() => navigate(`/tratamientos/${tratamiento.pacienteId}/${tratamiento.tratamientoId}`)}
              >
                <span className="treatment-icon"><Activity size={18} /></span>
                <span>
                  <strong>{tratamiento.paciente}</strong>
                  <small>{tratamiento.tipo}</small>
                </span>
                <span className="status-pill">Activo</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-status-grid">
        <article className="status-card">
          <Pill size={22} />
          <div><strong>{datos.medicacionesSinConfirmar.length}</strong><span>Medicaciones sin confirmar</span></div>
        </article>
        <article className="status-card">
          <FileWarning size={22} />
          <div><strong>{datos.estudiosPendientes.length}</strong><span>Estudios pendientes o vencidos</span></div>
        </article>
        <article className="status-card">
          <Clock3 size={22} />
          <div><strong>{datos.seguimientos.length}</strong><span>Pacientes que necesitan seguimiento</span></div>
        </article>
        <article className="status-card action-card">
          <Plus size={22} />
          <button onClick={() => navigate("/pacientes")}>Buscar paciente</button>
        </article>
      </section>
    </main>
  );
};

export default Dashboard;
