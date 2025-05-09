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

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [pacientesActivos, setPacientesActivos] = useState(0);
  const [turnosHoy, setTurnosHoy] = useState(0);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [usuariosDocs, setUsuariosDocs] = useState([]);
  const [tratamientosEsteMes, setTratamientosEsteMes] = useState(0);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const docs = usuariosSnapshot.docs;
        setUsuariosDocs(docs);
        setTotalPacientes(docs.length);
  
        let activos = 0;
        let tratamientos = 0;
        let turnos = 0;
        let tratamientosMes = 0;
  
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();
  
        for (const userDoc of docs) {
          const userRef = doc(db, "usuarios", userDoc.id);
  
          const tratamientosSnapshot = await getDocs(
            collection(userRef, "tratamientos")
          );
          tratamientosSnapshot.forEach((trat) => {
            const data = trat.data();
  
            if (data.fechaInicio) {
              const fechaInicio = data.fechaInicio?.seconds
                ? new Date(data.fechaInicio.seconds * 1000)
                : new Date(data.fechaInicio);
  
              if (
                fechaInicio.getMonth() === mesActual &&
                fechaInicio.getFullYear() === añoActual
              ) {
                tratamientosMes++;
              }
  
              if (data.activo === true) {
                activos++;
                tratamientos++;
              }
            }
          });
  
          const citasSnapshot = await getDocs(collection(userRef, "citas"));
          citasSnapshot.forEach((cita) => {
            const { fecha } = cita.data();
            if (fecha) {
              const fechaCita = new Date(fecha.seconds * 1000);
              fechaCita.setHours(0, 0, 0, 0);
              if (fechaCita.getTime() === hoy.getTime()) {
                turnos++;
              }
            }
          });
        }
  
        setPacientesActivos(activos);
        
        setTurnosHoy(turnos);
        setTratamientosEsteMes(tratamientosMes); // 👈 nuevo
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
      <div className="widgets">
        <div className="widget" onClick={() => setSelectedWidget("pacientes")}>
          Total de pacientes: {totalPacientes}
        </div>
        <div className="widget" onClick={() => setSelectedWidget("activos")}>
          Pacientes activos: {pacientesActivos}
        </div>
        <div className="widget" onClick={() => setSelectedWidget("turnos")}>
          Turnos hoy: {turnosHoy}
        </div>
        <div className="widget" onClick={() => setSelectedWidget("tratamientosMes")}>
          Tratamientos iniciados este mes: {tratamientosEsteMes}
        </div>
      </div>

      <div className="widget-detail">
          {selectedWidget === "pacientes" && (
            <DistribucionEdadesChart usuariosDocs={usuariosDocs} />
          )}
          {selectedWidget === "activos" && (
            <PacientesActivosResumen usuariosDocs={usuariosDocs} />
          )}
          {selectedWidget === "tratamientosMes" && (
            <TratamientosDelMes usuariosDocs={usuariosDocs} />
          )}
          {selectedWidget === "turnos" && (
            <TurnosHoy usuariosDocs={usuariosDocs} />
          )}


        {/* Aquí podrías ir agregando más contenido según el widget */}
      </div>
    </div>
  );
};

export default Dashboard;
