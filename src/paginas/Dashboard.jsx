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

const Dashboard = () => {
  const [loading, setLoading] = useState(true);

  const [tratamientosIniciados, setTratamientosIniciados] = useState(0);
  const [tratamientosFinalizados, setTratamientosFinalizados] = useState(0);
  const [pacientesActivos, setPacientesActivos] = useState(0);
  const [drogaStats, setDrogaStats] = useState({});

  const [selectedWidget, setSelectedWidget] = useState(null);
  const [usuariosDocs, setUsuariosDocs] = useState([]);

  // Lista detallada de tratamientos finalizados este mes
  const [tratamientosFinalizadosLista, setTratamientosFinalizadosLista] =
    useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const docs = usuariosSnapshot.docs;

        // Solo pacientes (no médicos)
        const pacientesDocs = docs.filter((doc) => doc.data().role !== "medico");
        setUsuariosDocs(pacientesDocs);

        let iniciadosMes = 0;
        let finalizadosMes = 0;
        let activos = 0;
        let drogas = {};
        const detallesFinalizados = [];

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();

        for (const userDoc of pacientesDocs) {
          const userRef = doc(db, "usuarios", userDoc.id);
          const userData = userDoc.data();

          const tratamientosSnapshot = await getDocs(
            collection(userRef, "tratamientos")
          );

          let tieneTratamientoActivo = false;

          tratamientosSnapshot.forEach((trat) => {
            const data = trat.data();

            // Fecha de inicio del tratamiento
            let fechaInicioTrat = null;
            if (data.fechaInicio) {
              if (data.fechaInicio?.seconds) {
                fechaInicioTrat = new Date(data.fechaInicio.seconds * 1000);
              } else {
                const f = new Date(data.fechaInicio);
                if (!isNaN(f.getTime())) fechaInicioTrat = f;
              }
            }

            /** 1) TRATAMIENTOS INICIADOS MES */
            if (fechaInicioTrat) {
              if (
                fechaInicioTrat.getMonth() === mesActual &&
                fechaInicioTrat.getFullYear() === añoActual
              ) {
                iniciadosMes++;
              }
            }

            /** 2) TRATAMIENTOS FINALIZADOS MES (conteo + detalle) */
            if (data.fechaFin) {
              const fechaFin = data.fechaFin?.seconds
                ? new Date(data.fechaFin.seconds * 1000)
                : new Date(data.fechaFin);

              const estado = data.estado;
              const esFinalizadoValido =
                (estado === "finalizado" || !estado) && !isNaN(fechaFin.getTime());

              if (
                esFinalizadoValido &&
                fechaFin.getMonth() === mesActual &&
                fechaFin.getFullYear() === añoActual
              ) {
                finalizadosMes++;

                detallesFinalizados.push({
                  pacienteId: userDoc.id,
                  tratamientoId: trat.id,
                  nombre: userData.nombre || "",
                  apellido: userData.apellido || "",
                  dni: userData.dni || "",
                  tipo: data.tipo || "-",
                  fechaInicio: fechaInicioTrat,
                  fechaFin,
                  // 👉 Campos de finalización
                  tipoFinalizacion: data.tipoFinalizacion || null,
                  motivoCancelacion: data.motivoCancelacion || null,
                  comentarioFinalizacion: data.comentarioFinalizacion || null,
                });
              }
            }

            /** 3) PACIENTES ACTIVOS */
            const estado = data.estado;
            const esTratamientoActivo =
              estado === "activo" ||
              estado === "Activo" ||
              (!estado && (data.activo === true || trat.id === "activo"));

            if (esTratamientoActivo) {
              tieneTratamientoActivo = true;
            }

            /** 4) DROGAS USADAS (sin tocar, cuenta aunque esté finalizado) */
            const acumularDroga = (med) => {
              if (!med || typeof med !== "object") return;
              const nombreDroga =
                med.nombre ||
                med.medicamento ||
                med.nombreComercial ||
                med.droga ||
                "Desconocida";
              const dosisPorDia = Number(med.dosis) || 0;
              const diasMed =
                Number(
                  med.duracionDias ?? med.duracion ?? med.dias ?? 1
                ) || 1;

              if (!fechaInicioTrat) return;
              if (
                fechaInicioTrat.getMonth() === mesActual &&
                fechaInicioTrat.getFullYear() === añoActual
              ) {
                drogas[nombreDroga] =
                  (drogas[nombreDroga] || 0) + dosisPorDia * diasMed;
              }
            };

            if (data.medicamentosPlanificados) {
              const fuente = Array.isArray(data.medicamentosPlanificados)
                ? data.medicamentosPlanificados
                : [data.medicamentosPlanificados];
              fuente.forEach(acumularDroga);
            }

            ["fsh", "hmg", "antagonista", "viaOral"].forEach((key) => {
              const val = data[key];
              if (!val) return;
              const arr = Array.isArray(val) ? val : [val];
              arr.forEach(acumularDroga);
            });
          });

          if (tieneTratamientoActivo) {
            activos++;
          }
        }

        setTratamientosIniciados(iniciadosMes);
        setTratamientosFinalizados(finalizadosMes);
        setPacientesActivos(activos);
        setDrogaStats(drogas);
        setTratamientosFinalizadosLista(detallesFinalizados);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loader />;

  // helpers drogas
  const drogasArray = Object.entries(drogaStats);
  const totalUI = drogasArray.reduce(
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

    // fallback genérico por si aparece algo nuevo
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
              <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "0.5rem" }}>
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
                    <span className="label">Total UI administradas</span>
                    <span className="valor">{totalUI}</span>
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
                      totalUI > 0
                        ? ((cantidad / totalUI) * 100).toFixed(1)
                        : 0;

                    return (
                      <div key={nombre} className="droga-item">
                        <div className="fila-superior">
                          <span className="droga-nombre">{nombre}</span>
                          <span className="droga-ui">
                            {cantidad} UI · {porcentaje}%
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
