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
  const { id: pacienteId } = useParams();
  const [estudios, setEstudios] = useState([]);
  const [graficoAnalisis, setGraficoAnalisis] = useState([]);
  const [graficoEcografias, setGraficoEcografias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const parseFecha = (fecha) => {
    if (!fecha) return null;
    if (fecha.seconds) return new Date(fecha.seconds * 1000);
    return new Date(fecha);
  };

  const formatearClave = (clave) =>
    clave.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());

  const toNumeroValido = (valor) => {
    const num = parseFloat(valor);
    return isNaN(num) ? null : num;
  };

  useEffect(() => {
    const cargarEstudios = async () => {
      try {
        setCargando(true);
        setError(null);
        const estudiosRef = collection(
          db,
          "usuarios",
          pacienteId,
          "tratamientos",
          "activo",
          "estudios"
        );
        const snapshot = await getDocs(estudiosRef);
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setEstudios(data);

        const analisis = data.filter((e) => e.tipoEstudio === "Análisis");
        const ecografias = data.filter((e) => e.tipoEstudio === "Ecografía");

        const grafico1 = analisis.map((e) => ({
          fecha: parseFecha(e.fecha)?.toLocaleDateString() || "Sin fecha",
          estradiol: toNumeroValido(e.estradiol),
          progesterona: toNumeroValido(e.progesterona),
          lh: toNumeroValido(e.lh),
        }));

        const grafico2 = ecografias.map((e) => ({
          fecha: parseFecha(e.fecha)?.toLocaleDateString() || "Sin fecha",
          total: toNumeroValido(e.foliculos),
          derecho: toNumeroValido(e.ovarioDerecho),
          izquierdo: toNumeroValido(e.ovarioIzquierdo),
        }));

        setGraficoAnalisis(grafico1);
        setGraficoEcografias(grafico2);
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
      setError("ID de paciente no definido.");
      setCargando(false);
    }
  }, [pacienteId]);

  const calcularPromedio = (campo) => {
    const valores = estudios
      .map((e) => parseFloat(e[campo]))
      .filter((v) => !isNaN(v));
    if (valores.length === 0) return "-";
    const total = valores.reduce((acc, v) => acc + v, 0);
    return (total / valores.length).toFixed(1);
  };

  const calcularUltimaFecha = () => {
    if (estudios.length === 0) return "-";
    const fechas = estudios.map((e) => parseFecha(e.fecha)).filter(Boolean);
    return fechas.sort((a, b) => b - a)[0].toLocaleDateString();
  };

  const calcularFrecuenciaPorTipo = (tipoEstudioFiltro) => {
    const diasUnicos = Array.from(
      new Set(
        estudios
          .filter((e) => e.tipoEstudio === tipoEstudioFiltro)
          .map((e) => {
            const f = parseFecha(e.fecha);
            if (!f) return null;
            const dia = f.getDate().toString().padStart(2, "0");
            const mes = (f.getMonth() + 1).toString().padStart(2, "0");
            const año = f.getFullYear();
            return `${año}-${mes}-${dia}`;
          })
          .filter(Boolean)
      )
    )
      .map((str) => new Date(str))
      .sort((a, b) => a - b);

    if (diasUnicos.length < 2) return "-";

    const intervalos = diasUnicos.slice(1).map((fecha, i) => {
      const anterior = diasUnicos[i];
      const diferencia = (fecha - anterior) / (1000 * 60 * 60 * 24);
      return diferencia;
    });

    const promedio = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;
    return promedio.toFixed(1) + " días";
  };

  // 👉 ahora excluimos creadoEn para que no aparezca como Timestamp(...)
  const camposExcluidos = [
    "id",
    "tipoEstudio",
    "fecha",
    "archivoURL",
    "uid",
    "userId",
    "usuarioId",
    "pacienteId",
    "creadoPor",
    "creadoEn",
  ];

  const mostrarCreador = (creadoPor) => {
    if (!creadoPor) return null;
    return (
      <p className="autor-carga">
        Cargado por: {creadoPor === "medico" ? "el médico" : "la paciente"}
      </p>
    );
  };

  const formatearCreadoEn = (creadoEn) => {
    const fecha = parseFecha(creadoEn);
    if (!fecha) return null;
    const fechaStr = fecha.toLocaleDateString();
    const horaStr = fecha.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${fechaStr} ${horaStr}`;
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
            <p>
              Fecha:{" "}
              {parseFecha(est.fecha)?.toLocaleDateString() || "Sin fecha"}
            </p>

            {est.creadoEn && (
              <p className="creado-en">
                Creado el: {formatearCreadoEn(est.creadoEn)}
              </p>
            )}

            <ul>
              {Object.entries(est).map(([clave, valor]) => {
  if (camposExcluidos.includes(clave)) return null;

  // Ocultar campos vacíos, null, undefined o strings en blanco
  if (
    valor === null ||
    valor === undefined ||
    valor === "" ||
    (typeof valor === "string" && valor.trim() === "")
  ) {
    return null;
  }

  return (
    <li key={clave}>{`${formatearClave(clave)}: ${valor}`}</li>
  );
})}

            </ul>
            {mostrarCreador(est.creadoPor)}
            {est.archivoURL && (
              <a href={est.archivoURL} target="_blank" rel="noopener noreferrer">
                Ver archivo
              </a>
            )}
          </div>
        ))}
      </div>

      {graficoAnalisis.length > 0 && (
        <>
          <h3>Evolución de valores hormonales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={graficoAnalisis}
              margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="estradiol"
                stroke="#8884d8"
                name="Estradiol"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="progesterona"
                stroke="#82ca9d"
                name="Progesterona"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="lh"
                stroke="#ffc658"
                name="LH"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      {graficoEcografias.length > 0 && (
        <>
          <h3>Evolución ecográfica</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={graficoEcografias}
              margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#ff7300"
                name="Recuento total"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="derecho"
                stroke="#82ca9d"
                name="Ovario derecho"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="izquierdo"
                stroke="#8884d8"
                name="Ovario izquierdo"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      <h3>Estadísticas generales</h3>
      <div className="stats">
        <div>Promedio Estradiol: {calcularPromedio("estradiol")}</div>
        <div>Promedio Progesterona: {calcularPromedio("progesterona")}</div>
        <div>Promedio LH: {calcularPromedio("lh")}</div>
        <div>
          Promedio Recuento Folicular: {calcularPromedio("foliculos")}
        </div>
        <div>Último estudio: {calcularUltimaFecha()}</div>
        <div>
          Frecuencia de análisis clínicos:{" "}
          {calcularFrecuenciaPorTipo("Análisis")}
        </div>
        <div>
          Frecuencia de ecografías:{" "}
          {calcularFrecuenciaPorTipo("Ecografía")}
        </div>
      </div>
    </div>
  );
};

export default AnalisisYEvolucion;
