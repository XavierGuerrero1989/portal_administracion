import "./TurnosHoy.scss";

import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import Loader from "./Loader";
import { db } from "../firebase";

const TurnosHoy = ({ usuariosDocs }) => {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTurnosHoy = async () => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const listaTurnos = [];

      for (const userDoc of usuariosDocs) {
        const usuario = userDoc.data();
        const citasSnap = await getDocs(
          collection(db, `usuarios/${userDoc.id}/citas`)
        );

        citasSnap.forEach((cita) => {
          const data = cita.data();
          if (!data.fecha) return;

          const fechaCita = new Date(data.fecha.seconds * 1000);
          fechaCita.setHours(0, 0, 0, 0);

          if (fechaCita.getTime() === hoy.getTime()) {
            listaTurnos.push({
              nombre: `${usuario.nombre} ${usuario.apellido}`,
              hora: data.hora || "Sin hora",
              motivo: data.motivo || "Sin motivo",
            });
          }
        });
      }

      // Ordenar turnos por hora
      listaTurnos.sort((a, b) => a.hora.localeCompare(b.hora));
      setTurnos(listaTurnos);
      setLoading(false);
    };

    fetchTurnosHoy();
  }, [usuariosDocs]);

  if (loading) return <Loader />;

  return (
    <div className="turnos-hoy">
      <h3 className="titulo">Turnos del día</h3>
      {turnos.length === 0 ? (
        <p className="mensaje-vacio">No hay turnos agendados para hoy.</p>
      ) : (
        <ul className="lista-turnos">
          {turnos.map((turno, index) => (
            <li key={index} className="turno-item">
              <div className="hora">🕒 {turno.hora}</div>
              <div className="info">
                <span className="nombre">{turno.nombre}</span>
                <span className="motivo">{turno.motivo}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TurnosHoy;
