import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import Loader from "./Loader";
import { db } from "../firebase";

const COLORS = ["#00bfa6", "#845ef7", "#339af0", "#ff6b6b", "#ffa94d"];

const TratamientosDelMes = ({ usuariosDocs }) => {
  const [tratamientosMes, setTratamientosMes] = useState([]);
  const [resumenPorTipo, setResumenPorTipo] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();

    const resumen = {};
    const lista = [];

    const fetchData = async () => {
      for (const userDoc of usuariosDocs) {
        const usuario = userDoc.data();
        const tratamientosSnap = await getDocs(
          collection(db, `usuarios/${userDoc.id}/tratamientos`)
        );

        tratamientosSnap.forEach((trat) => {
          const data = trat.data();
          const tipo = data.tipo || "Sin tipo";
          const fechaInicio = data.fechaInicio?.seconds
            ? new Date(data.fechaInicio.seconds * 1000)
            : new Date(data.fechaInicio);

          if (
            fechaInicio.getMonth() === mesActual &&
            fechaInicio.getFullYear() === añoActual
          ) {
            const diaActual = Math.floor(
              (hoy - fechaInicio) / (1000 * 60 * 60 * 24)
            ) + 1;

            lista.push({
              nombre: `${usuario.nombre} ${usuario.apellido}`,
              fechaInicio: fechaInicio.toLocaleDateString(),
              tipo,
              dia: diaActual,
            });

            if (resumen[tipo]) {
              resumen[tipo]++;
            } else {
              resumen[tipo] = 1;
            }
          }
        });
      }

      const dataPie = Object.entries(resumen).map(([tipo, cantidad]) => ({
        name: tipo,
        value: cantidad,
      }));

      setTratamientosMes(lista);
      setResumenPorTipo(dataPie);
      setLoading(false);
    };

    fetchData();
  }, [usuariosDocs]);

  if (loading) return <Loader />;

  return (
    <div className="tratamientos-mes">
      <h3 className="titulo">Tratamientos iniciados este mes</h3>

      <div className="chart">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={resumenPorTipo}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              fill="#8884d8"
              label
            >
              {resumenPorTipo.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="lista-tratamientos">
        {tratamientosMes.length === 0 ? (
          <p className="mensaje-vacio">No se han iniciado tratamientos este mes.</p>
        ) : (
          tratamientosMes.map((p, i) => (
            <div key={i} className="card-tratamiento">
              <div className="nombre">{p.nombre}</div>
              <div className="detalle">
                <span>📅 Inicio: {p.fechaInicio} — Día {p.dia}</span>
                <span>🧬 Tipo: {p.tipo}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TratamientosDelMes;
