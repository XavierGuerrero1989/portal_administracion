import "./Dashboard.scss";

import React, { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
} from "firebase/firestore";

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

  const [drogaStats, setDrogaStats] = useState({}); // { Gonal: 500, Elonva: 150 }

  const [selectedWidget, setSelectedWidget] = useState(null);
  const [usuariosDocs, setUsuariosDocs] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const docs = usuariosSnapshot.docs;

        // Filtrar solo pacientes (excluir médicos)
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

            /** -----------------------------
             * 1) TRATAMIENTOS INICIADOS MES
             * ----------------------------- */
            if (data.fechaInicio) {
              const fechaInicio = data.fechaInicio?.seconds
                ? new Date(data.fechaInicio.seconds * 1000)
                : new Date(data.fechaInicio);

              if (
                fechaInicio.getMonth() === mesActual &&
                fechaInicio.getFullYear() === añoActual
              ) {
                iniciadosMes++;
              }
            }

            /** -----------------------------
             * 2) TRATAMIENTOS FINALIZADOS MES
             * ----------------------------- */
            if (data.fechaFin) {
              const fechaFin = data.fechaFin?.seconds
                ? new Date(data.fechaFin.seconds * 1000)
                : new Date(data.fechaFin);

              if (
                fechaFin.getMonth() === mesActual &&
                fechaFin.getFullYear() === añoActual
              ) {
                finalizadosMes++;
              }
            }

            /** -----------------------------
             * 3) PACIENTES ACTIVOS
             * ----------------------------- */
            if (data.activo === true) {
              activos++;
            }

            /** -----------------------------
             * 4) CANTIDAD DE CADA DROGA USADA ESTE MES
             * ----------------------------- */

            const categoriaListas = ["fsh", "hmg", "viaOral", "antagonistas"];

            categoriaListas.forEach((categoria) => {
              if (Array.isArray(data[categoria])) {
                data[categoria].forEach((item) => {
                  if (item.fecha) {
                    const fechaItem = item.fecha?.seconds
                      ? new Date(item.fecha.seconds * 1000)
                      : new Date(item.fecha);

                    if (
                      fechaItem.getMonth() === mesActual &&
                      fechaItem.getFullYear() === añoActual
                    ) {
                      const nombreDroga = item.droga || item.nombre || "Desconocida";
                      const dosis = Number(item.dosis) || 0;

                      drogas[nombreDroga] = (drogas[nombreDroga] || 0) + dosis;
                    }
                  }
                });
              }
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

  return (
    <div className="dashboard">
      <h2>Resumen general</h2>

      <div className="acciones-dashboard">
        <button className="boton-nuevo" onClick={() => navigate("/pacientes/nuevo")}>
          <span className="icono">+</span> Nuevo paciente
        </button>
      </div>

      {/* WIDGETS CON NUEVO ORDEN */}
      <div className="widgets">
        
        {/* 1 - TRATAMIENTOS INICIADOS */}
        <div className="widget" onClick={() => setSelectedWidget("iniciados")}>
          Tratamientos iniciados este mes: {tratamientosIniciados}
        </div>

        {/* 2 - TRATAMIENTOS FINALIZADOS */}
        <div className="widget" onClick={() => setSelectedWidget("finalizados")}>
          Tratamientos finalizados este mes: {tratamientosFinalizados}
        </div>

        {/* 3 - PACIENTES ACTIVOS */}
        <div className="widget" onClick={() => setSelectedWidget("activos")}>
          Pacientes activos: {pacientesActivos}
        </div>

        {/* 4 - DROGAS USADAS */}
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
            <h3>Tratamientos Finalizados</h3>
            <p>(Aún sin datos — pronto aparecerán aquí)</p>
          </div>
        )}

        {selectedWidget === "activos" && (
          <PacientesActivosResumen usuariosDocs={usuariosDocs} />
        )}

        {selectedWidget === "drogas" && (
          <div>
            <h3>Drogas utilizadas este mes</h3>

            {Object.keys(drogaStats).length === 0 ? (
              <p>No se registran drogas este mes.</p>
            ) : (
              <ul>
                {Object.entries(drogaStats).map(([droga, total]) => (
                  <li key={droga}>
                    <strong>{droga}</strong>: {total} UI
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
