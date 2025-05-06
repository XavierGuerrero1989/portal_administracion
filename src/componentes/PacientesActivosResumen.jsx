import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Loader from "./Loader";
import "./PacientesActivosResumen.scss";

const PacientesActivosResumen = ({ usuariosDocs }) => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPacientesActivos = async () => {
      const hoy = new Date();
      const lista = [];

      for (const docUsuario of usuariosDocs) {
        const usuarioData = docUsuario.data();
        const tratamientosSnap = await getDocs(
          collection(db, `usuarios/${docUsuario.id}/tratamientos`)
        );

        tratamientosSnap.forEach((tratDoc) => {
          const trat = tratDoc.data();
          if (trat.activo) {
            const fechaInicio = trat.fechaInicio?.seconds
              ? new Date(trat.fechaInicio.seconds * 1000)
              : new Date(trat.fechaInicio);

            const diaActual = Math.floor(
              (hoy - fechaInicio) / (1000 * 60 * 60 * 24)
            ) + 1;

            const drogas = [];

            if (trat.fsh?.medicamento) drogas.push(trat.fsh.medicamento);
            if (trat.hmg?.medicamento) drogas.push(trat.hmg.medicamento);
            if (trat.antagonista?.medicamento) drogas.push(trat.antagonista.medicamento);
            if (trat.viaOral?.medicamento) drogas.push(trat.viaOral.medicamento);

            lista.push({
              nombre: `${usuarioData.nombre} ${usuarioData.apellido}`,
              fechaInicio: fechaInicio.toLocaleDateString(),
              tipo: trat.tipo || "N/A",
              dia: diaActual,
              drogas,
            });
          }
        });
      }

      setPacientes(lista);
      setLoading(false);
    };

    fetchPacientesActivos();
  }, [usuariosDocs]);

  if (loading) return <Loader />;

  return (
    <div className="pacientes-activos">
      <h3 className="titulo">Pacientes en tratamiento activo</h3>
      {pacientes.length === 0 ? (
        <p className="mensaje-vacio">No hay pacientes activos.</p>
      ) : (
        <div className="lista-pacientes">
          {pacientes.map((p, i) => (
            <div key={i} className="card-paciente">
              <div className="nombre">{p.nombre}</div>
              <div className="detalle">
                <span>📅 Inicio: {p.fechaInicio} — Día {p.dia}</span>
                <span>🧬 Tipo: {p.tipo}</span>
                <span>💊 Drogas: {p.drogas.join(", ") || "Ninguna"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PacientesActivosResumen;
