import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Loader from "./Loader";
import "./DistribucionEdadesChart.scss";

const DistribucionEdadesChart = ({ usuariosDocs }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calcularEdades = () => {
      const hoy = new Date();
      const rangos = {
        "<25": 0,
        "25–29": 0,
        "30–34": 0,
        "35–39": 0,
        "40–44": 0,
        "45+": 0,
      };

      usuariosDocs.forEach((doc) => {
        const { fechaNacimiento } = doc.data();

        let nacimiento;

        // ✅ Soporta tanto timestamps como strings
        if (fechaNacimiento?.seconds) {
          nacimiento = new Date(fechaNacimiento.seconds * 1000);
        } else if (typeof fechaNacimiento === "string") {
          nacimiento = new Date(fechaNacimiento); // "1989-07-13"
        }

        if (!nacimiento || isNaN(nacimiento)) return;

        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const mesDiff = hoy.getMonth() - nacimiento.getMonth();
        if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
          edad--;
        }

        if (edad < 25) rangos["<25"]++;
        else if (edad < 30) rangos["25–29"]++;
        else if (edad < 35) rangos["30–34"]++;
        else if (edad < 40) rangos["35–39"]++;
        else if (edad < 45) rangos["40–44"]++;
        else rangos["45+"]++;
      });

      const dataFinal = Object.entries(rangos).map(([rango, pacientes]) => ({
        rango,
        pacientes,
      }));

      setData(dataFinal);
      setLoading(false);
    };

    calcularEdades();
  }, [usuariosDocs]);

  if (loading) return <Loader />;

  return (
    <div className="edad-chart-container">
      <h3 className="edad-chart-title">Distribución de edades de pacientes</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="rango" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="pacientes" fill="#845ef7" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DistribucionEdadesChart;
