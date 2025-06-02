import "./AnalisisYEvolucion.scss";
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const AnalisisYEvolucion = () => {
  const { id: pacienteId } = useParams(); // ← ahora lo tomamos directamente desde la URL
  const [estudios, setEstudios] = useState([]);
  const [valoresGrafico, setValoresGrafico] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const parseFecha = (fecha) => {
    if (!fecha) return null;
    if (fecha.seconds) return new Date(fecha.seconds * 1000);
    return new Date(fecha); // si es string
  };

  useEffect(() => {
    const cargarEstudios = async () => {
      try {
        setCargando(true);
        setError(null);
        console.log("📌 Iniciando carga de estudios para:", pacienteId);

        const estudiosRef = collection(
          db,
          "usuarios",
          pacienteId,
          "tratamientos",
          "activo",
          "estudios"
        );
        const snapshot = await getDocs(estudiosRef);
        console.log("📥 Documentos encontrados:", snapshot.docs.length);

        if (snapshot.docs.length === 0) {
          console.warn("⚠️ No se encontraron estudios.");
        }

        const data = snapshot.docs.map((doc) => {
          const d = { id: doc.id, ...doc.data() };
          console.log("📄 Documento:", d);
          return d;
        });

        setEstudios(data);

        const grafico = data.map((e) => ({
          fecha: parseFecha(e.fecha)?.toLocaleDateString() || "Sin fecha",
          estradiol: Number(e.estradiol) || null,
          progesterona: Number(e.progesterona) || null,
          lh: Number(e.lh) || null,
          foliculos: Number(e.recuentoFolicular) || null,
        }));

        setValoresGrafico(grafico);
      } catch (error) {
        console.error("❌ Error al cargar estudios:", error);
        setError("Error al cargar los estudios. Ver consola.");
      } finally {
        setCargando(false);
      }
    };

    if (pacienteId) {
      cargarEstudios();
    } else {
      console.error("❌ pacienteId no definido");
      setError("ID de paciente no definido.");
      setCargando(false);
    }
  }, [pacienteId]);

  const calcularPromedio = (campo) => {
    const valores = estudios.map((e) => Number(e[campo])).filter((v) => !isNaN(v));
    if (valores.length === 0) return "-";
    const total = valores.reduce((acc, v) => acc + v, 0);
    return (total / valores.length).toFixed(1);
  };

  const calcularUltimaFecha = () => {
    if (estudios.length === 0) return "-";
    const fechas = estudios.map((e) => parseFecha(e.fecha)).filter(Boolean);
    return fechas.sort((a, b) => b - a)[0].toLocaleDateString();
  };

  const calcularFrecuencia = () => {
    const fechas = estudios.map((e) => parseFecha(e.fecha)).filter(Boolean).sort((a, b) => a - b);
    if (fechas.length < 2) return "-";
    const intervalos = fechas.slice(1).map((f, i) => (f - fechas[i]) / (1000 * 60 * 60 * 24));
    const promedio = intervalos.reduce((acc, v) => acc + v, 0) / intervalos.length;
    return promedio.toFixed(1) + " días";
  };

  return (
    <div className="analisis-evolucion">
      <h3>Análisis médicos</h3>

      {cargando && <p>Cargando estudios...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!cargando && estudios.length === 0 && !error && (
        <p>No hay estudios cargados para este paciente.</p>
      )}

      <div className="cards-estudios">
        {estudios.map((est) => (
          <div className="card-estudio" key={est.id}>
            <strong>{est.tipoEstudio || "Sin tipo"}</strong>
            <p>Fecha: {parseFecha(est.fecha)?.toLocaleDateString() || "Sin fecha"}</p>
            <ul>
              {est.estradiol && <li>Estradiol: {est.estradiol}</li>}
              {est.progesterona && <li>Progesterona: {est.progesterona}</li>}
              {est.lh && <li>LH: {est.lh}</li>}
              {est.recuentoFolicular && <li>Recuento Folicular: {est.recuentoFolicular}</li>}
            </ul>
            {est.archivoURL && (
              <a href={est.archivoURL} target="_blank" rel="noopener noreferrer">
                Ver archivo
              </a>
            )}
          </div>
        ))}
      </div>

      {estudios.length > 0 && (
        <>
          <h3>Evolución de valores</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={valoresGrafico} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="estradiol" stroke="#8884d8" name="Estradiol" />
              <Line type="monotone" dataKey="progesterona" stroke="#82ca9d" name="Progesterona" />
              <Line type="monotone" dataKey="lh" stroke="#ffc658" name="LH" />
              <Line type="monotone" dataKey="foliculos" stroke="#ff7300" name="Recuento Folicular" />
            </LineChart>
          </ResponsiveContainer>

          <h3>Estadísticas generales</h3>
          <div className="stats">
            <div>Promedio Estradiol: {calcularPromedio("estradiol")}</div>
            <div>Promedio Progesterona: {calcularPromedio("progesterona")}</div>
            <div>Promedio LH: {calcularPromedio("lh")}</div>
            <div>Promedio Recuento Folicular: {calcularPromedio("recuentoFolicular")}</div>
            <div>Último estudio: {calcularUltimaFecha()}</div>
            <div>Frecuencia de análisis: {calcularFrecuencia()}</div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalisisYEvolucion;
