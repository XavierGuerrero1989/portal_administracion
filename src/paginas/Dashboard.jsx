import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import Loader from "../componentes/Loader"; // tu loader personalizado
import "./Dashboard.scss";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [pacientesActivos, setPacientesActivos] = useState(0);
  const [tratamientosActivos, setTratamientosActivos] = useState(0);
  const [turnosHoy, setTurnosHoy] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usuariosSnapshot = await getDocs(collection(db, "usuarios"));
        const usuariosDocs = usuariosSnapshot.docs;

        setTotalPacientes(usuariosDocs.length);

        let activos = 0;
        let tratamientos = 0;
        let turnos = 0;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        for (const userDoc of usuariosDocs) {
          const userRef = doc(db, "usuarios", userDoc.id);

          // Tratamientos
          const tratamientosSnapshot = await getDocs(
            collection(userRef, "tratamientos")
          );
          tratamientosSnapshot.forEach((trat) => {
            const data = trat.data();
            if (data.activo === true) {
              activos++;
              tratamientos++;
            }
          });

          // Turnos de hoy
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
        setTratamientosActivos(tratamientos);
        setTurnosHoy(turnos);
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
        <div className="widget">Total de pacientes: {totalPacientes}</div>
        <div className="widget">Pacientes activos: {pacientesActivos}</div>
        <div className="widget">Tratamientos activos: {tratamientosActivos}</div>
        <div className="widget">Turnos hoy: {turnosHoy}</div>
      </div>
    </div>
  );
};

export default Dashboard;
