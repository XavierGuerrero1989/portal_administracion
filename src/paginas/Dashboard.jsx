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

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();

        for (const userDoc of pacientesDocs) {
          const userRef = doc(db, "usuarios", userDoc.id);
          const tratamientosSnapshot = await getDocs(
            collection(userRef, "tratamientos")
          );

          tratamientosSnapshot.forEach((trat) => {
            const data = trat.data();

            // Fecha de inicio del tratamiento (si existe)
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

            /** 2) TRATAMIENTOS FINALIZADOS MES */
            if (data.fechaFin) {
              const fechaFin = data.fechaFin?.seconds
                ? new Date(data.fechaFin.seconds * 1000)
                : new Date(data.fechaFin);

              if (
                !isNaN(fechaFin.getTime()) &&
                fechaFin.getMonth() === mesActual &&
                fechaFin.getFullYear() === añoActual
              ) {
                finalizadosMes++;
              }
            }

            /** 3) PACIENTES ACTIVOS */
            const esActivo =
              data.activo === true ||
              data.estado === "activo" ||
              data.estado === "Activo" ||
              trat.id === "activo";

            if (esActivo) {
              activos++;
            }

            /** 4) CANTIDAD DE CADA DROGA USADA ESTE MES
             *    (aprox: dosis x días para tratamientos que inician este mes)
             */

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

            // medicamentosPlanificados (caso Salvador)
            if (data.medicamentosPlanificados) {
              const fuente = Array.isArray(data.medicamentosPlanificados)
                ? data.medicamentosPlanificados
                : [data.medicamentosPlanificados];
              fuente.forEach(acumularDroga);
            }

            // Otros tipos (fsh, hmg, antagonista, viaOral)
            ["fsh", "hmg", "antagonista", "viaOral"].forEach((key) => {
              const val = data[key];
              if (!val) return;
              const arr = Array.isArray(val) ? val : [val];
              arr.forEach(acumularDroga);
            });
          });
        }

        setTratamientosIniciados(iniciadosMes);
        setTratamientosFinalizados(finalizadosMes);
        setPacientesActivos(activos);
        setDrogaStats(drogas);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loader />;

  // --- helpers derivados de drogaStats para la vista dinámica ---
  const drogasArray = Object.entries(drogaStats); // [ [nombre, totalUI], ... ]
  const totalUI = drogasArray.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);
  const drogasOrdenadas = [...drogasArray].sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0));

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
            <p style={{ fontSize: "0.9rem", color: "#666" }}>
              (Más adelante podemos listar cada tratamiento aquí.)
            </p>
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
                      totalUI > 0 ? ((cantidad / totalUI) * 100).toFixed(1) : 0;

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
