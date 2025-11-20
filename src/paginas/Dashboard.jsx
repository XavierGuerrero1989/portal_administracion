import "./Dashboard.scss";

import React, { useEffect, useState } from "react";
import { collection, doc, getDocs } from "firebase/firestore";

import DistribucionEdadesChart from "../componentes/DistribucionEdadesChart";
import Loader from "../componentes/Loader";
import PacientesActivosResumen from "../componentes/PacientesActivosResumen";
import TratamientosDelMes from "../componentes/TratamientosDelMes";
import TurnosHoy from "../componentes/TurnosHoy";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

const parseFechaFlexible = (valor) => {
  if (!valor) return null;

  // Timestamp Firestore
  if (typeof valor === "object") {
    if (typeof valor.toDate === "function") return valor.toDate();
    if (typeof valor.seconds === "number") return new Date(valor.seconds * 1000);
  }

  // String o Date
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? null : valor;
  }

  if (typeof valor === "string") {
    // 1) Intento directo (ISO, etc.)
    let f = new Date(valor);
    if (!isNaN(f.getTime())) return f;

    // 2) Formato dd/mm/yyyy o dd-mm-yyyy
    const m = valor.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m) {
      const d = parseInt(m[1], 10);
      const mes = parseInt(m[2], 10) - 1;
      const anio = parseInt(m[3], 10);
      f = new Date(anio, mes, d);
      if (!isNaN(f.getTime())) return f;
    }
  }

  return null;
};

const esDeEsteMes = (fecha, mesActual, añoActual) => {
  if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) return false;
  return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);

  const [tratamientosIniciados, setTratamientosIniciados] = useState(0);
  const [tratamientosFinalizados, setTratamientosFinalizados] = useState(0);
  const [pacientesActivos, setPacientesActivos] = useState(0);
  const [drogaStats, setDrogaStats] = useState({});

  const [selectedWidget, setSelectedWidget] = useState(null);
  const [usuariosDocs, setUsuariosDocs] = useState([]);

  const [tratamientosFinalizadosLista, setTratamientosFinalizadosLista] =
    useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const docs = usuariosSnapshot.docs;

        // Solo pacientes (no médicos)
        const pacientesDocs = docs.filter((docu) => docu.data().role !== "medico");
        setUsuariosDocs(pacientesDocs);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();

        // 1) Armar una lista PLANA de todos los tratamientos
        const todosLosTratamientos = [];

        for (const userDoc of pacientesDocs) {
          const userRef = doc(db, "usuarios", userDoc.id);
          const userData = userDoc.data();

          const tratamientosSnapshot = await getDocs(
            collection(userRef, "tratamientos")
          );

          tratamientosSnapshot.forEach((tratDoc) => {
            // ⚠️ YA NO IGNORAMOS "activo": lo tratamos como tratamiento real
            const data = tratDoc.data();

            const fechaInicio =
              parseFechaFlexible(data.fechaInicio) ||
              parseFechaFlexible(data.createdAt) ||
              parseFechaFlexible(data.fecha);

            const fechaFin = parseFechaFlexible(data.fechaFin);

            const estadoLower = String(data.estado || "").toLowerCase();

            // Normalizamos medicamentosPlanificados a array SIEMPRE
            let meds = [];
            if (data.medicamentosPlanificados) {
              if (Array.isArray(data.medicamentosPlanificados)) {
                meds = data.medicamentosPlanificados.filter(
                  (m) => m && typeof m === "object"
                );
              } else if (
                data.medicamentosPlanificados &&
                typeof data.medicamentosPlanificados === "object"
              ) {
                meds = [data.medicamentosPlanificados];
              }
            }

            todosLosTratamientos.push({
              pacienteId: userDoc.id,
              nombre: userData.nombre || "",
              apellido: userData.apellido || "",
              dni: userData.dni || "",
              tratamientoId: tratDoc.id,
              fechaInicio,
              fechaFin,
              estadoLower,
              tipo: data.tipoTratamiento || data.tipo || "-",
              medicamentosPlanificados: meds,
              tipoFinalizacion: data.tipoFinalizacion || null,
              motivoCancelacion: data.motivoCancelacion || null,
              comentarioFinalizacion: data.comentarioFinalizacion || null,
            });
          });
        }

        // 2) Cálculos a partir de la lista plana

        // a) Tratamientos iniciados este mes
        const iniciados = todosLosTratamientos.filter((t) =>
          esDeEsteMes(t.fechaInicio, mesActual, añoActual)
        ).length;

        // b) Tratamientos finalizados este mes (+ detalle)
        const finalizadosLista = todosLosTratamientos.filter((t) => {
          const esFinalizado = t.estadoLower === "finalizado";
          return esFinalizado && esDeEsteMes(t.fechaFin, mesActual, añoActual);
        });

        const finalizados = finalizadosLista.length;

        // c) Pacientes activos (al menos un tratamiento con estado "activo")
        const pacientesActivosSet = new Set(
          todosLosTratamientos
            .filter((t) => t.estadoLower === "activo")
            .map((t) => t.pacienteId)
        );
        const activos = pacientesActivosSet.size;

        // d) Drogas usadas este mes (solo medicamentosPlanificados)
        const drogas = {};

        todosLosTratamientos.forEach((t) => {
          const esActivo = t.estadoLower === "activo";
          const inicioEsteMes = esDeEsteMes(t.fechaInicio, mesActual, añoActual);
          const finEsteMes = esDeEsteMes(t.fechaFin, mesActual, añoActual);

          // Consideramos drogas de:
          // - tratamientos activos
          // - o tratamientos iniciados este mes
          // - o tratamientos finalizados este mes
          if (!esActivo && !inicioEsteMes && !finEsteMes) return;

          t.medicamentosPlanificados.forEach((med) => {
            const nombreDroga =
              med.nombre ||
              med.medicamento ||
              med.nombreComercial ||
              med.droga ||
              "Desconocida";

            const diasMed =
              Number(
                med.duracionDias ??
                  med.duracion ??
                  med.dias ??
                  1
              ) || 1;

            drogas[nombreDroga] = (drogas[nombreDroga] || 0) + diasMed;
          });
        });

        // 3) Actualizar estados
        setTratamientosIniciados(iniciados);
        setTratamientosFinalizados(finalizados);
        setPacientesActivos(activos);
        setDrogaStats(drogas);
        setTratamientosFinalizadosLista(finalizadosLista);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loader />;

  // === helpers drogas ===
  const drogasArray = Object.entries(drogaStats);

  const totalAplicaciones = drogasArray.reduce(
    (acc, [, total]) => acc + (Number(total) || 0),
    0
  );

  const drogasOrdenadas = [...drogasArray].sort(
    (a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0)
  );

  const formatearFecha = (d) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const formatearFinalizacion = (t) => {
    const tipo = (t.tipoFinalizacion || "").toLowerCase();

    if (!tipo) return "-";

    if (tipo === "puncion" || tipo === "punción") {
      return "Punción";
    }

    if (tipo === "cancelacion" || tipo === "cancelación") {
      let texto = "Cancelación de estímulo";
      if (t.motivoCancelacion) {
        texto += ` – ${t.motivoCancelacion}`;
      }
      return texto;
    }

    // fallback genérico
    return t.tipoFinalizacion;
  };

  return (
    <div className="dashboard">
      <h2>Resumen general</h2>

      <div className="acciones-dashboard">
        <button
          className="boton-nuevo"
          onClick={() => navigate("/pacientes/nuevo")}
        >
          <span className="icono">+</span> Nuevo paciente
        </button>
      </div>

      <div className="widgets">
        <div className="widget" onClick={() => setSelectedWidget("iniciados")}>
          Tratamientos iniciados este mes: {tratamientosIniciados}
        </div>

        <div
          className="widget"
          onClick={() => setSelectedWidget("finalizados")}
        >
          Tratamientos finalizados este mes: {tratamientosFinalizados}
        </div>

        <div className="widget" onClick={() => setSelectedWidget("activos")}>
          Pacientes activos: {pacientesActivos}
        </div>

        <div className="widget" onClick={() => setSelectedWidget("drogas")}>
          Drogas utilizadas este mes: {Object.keys(drogaStats).length}
        </div>
      </div>

      <div className="widget-detail">
        {selectedWidget === "iniciados" && (
          <TratamientosDelMes usuariosDocs={usuariosDocs} />
        )}

        {selectedWidget === "finalizados" && (
          <div>
            <h3>Tratamientos finalizados este mes</h3>
            <p>
              Total: <strong>{tratamientosFinalizados}</strong>
            </p>

            {tratamientosFinalizadosLista.length === 0 ? (
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "#666",
                  marginTop: "0.5rem",
                }}
              >
                No hay tratamientos finalizados en este mes.
              </p>
            ) : (
              <div className="tabla-mini">
                <table>
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>DNI</th>
                      <th>Tipo</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Finalización</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tratamientosFinalizadosLista.map((t, idx) => (
                      <tr key={`${t.pacienteId}-${t.tratamientoId}-${idx}`}>
                        <td>
                          {t.nombre} {t.apellido}
                        </td>
                        <td>{t.dni}</td>
                        <td>{t.tipo}</td>
                        <td>{formatearFecha(t.fechaInicio)}</td>
                        <td>{formatearFecha(t.fechaFin)}</td>
                        <td>
                          <div>{formatearFinalizacion(t)}</div>
                          {t.comentarioFinalizacion && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#6b7280",
                                marginTop: "2px",
                              }}
                            >
                              {t.comentarioFinalizacion}
                            </div>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn-link"
                            onClick={() =>
                              navigate(
                                `/tratamientos/${t.pacienteId}/${t.tratamientoId}`
                              )
                            }
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selectedWidget === "activos" && (
          <PacientesActivosResumen usuariosDocs={usuariosDocs} />
        )}

        {selectedWidget === "drogas" && (
          <div className="drogas-detalle">
            <h3>Drogas utilizadas este mes</h3>

            {drogasArray.length === 0 ? (
              <p>No se registran drogas este mes.</p>
            ) : (
              <>
                <div className="drogas-resumen">
                  <div>
                    <span className="label">Total de aplicaciones</span>
                    <span className="valor">{totalAplicaciones}</span>
                  </div>
                  <div>
                    <span className="label">Drogas diferentes</span>
                    <span className="valor">{drogasArray.length}</span>
                  </div>
                  <div>
                    <span className="label">Droga más utilizada</span>
                    <span className="valor">
                      {drogasOrdenadas[0]?.[0] || "-"}
                    </span>
                  </div>
                </div>

                <div className="drogas-lista">
                  {drogasOrdenadas.map(([nombre, total]) => {
                    const cantidad = Number(total) || 0;
                    const porcentaje =
                      totalAplicaciones > 0
                        ? ((cantidad / totalAplicaciones) * 100).toFixed(1)
                        : 0;

                    return (
                      <div key={nombre} className="droga-item">
                        <div className="fila-superior">
                          <span className="droga-nombre">{nombre}</span>
                          <span className="droga-ui">
                            {cantidad} aplicaciones · {porcentaje}%
                          </span>
                        </div>
                        <div className="barra-bg">
                          <div
                            className="barra-fill"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
