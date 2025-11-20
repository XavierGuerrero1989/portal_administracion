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

const parseFecha = (fecha) => {
  if (!fecha) return null;
  if (fecha?.toDate) return fecha.toDate();
  if (fecha?.seconds) return new Date(fecha.seconds * 1000);
  return new Date(fecha);
};

const formatearClave = (clave) =>
  clave
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());

const toNumeroValido = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const num = parseFloat(valor);
  return isNaN(num) ? null : num;
};

const normalizarTipoEstudio = (tipoEstudio) => {
  const t = String(tipoEstudio || "").toLowerCase();
  if (t === "analisis" || t === "análisis") return "analisis";
  if (t === "ecografia" || t === "ecografía") return "ecografia";
  return t || "sin_tipo";
};

const etiquetaTipoEstudio = (tipoEstudio) => {
  const n = normalizarTipoEstudio(tipoEstudio);
  if (n === "analisis") return "Análisis";
  if (n === "ecografia") return "Ecografía";
  if (n === "sin_tipo") return "Sin tipo";
  return n.charAt(0).toUpperCase() + n.slice(1);
};

const AnalisisYEvolucion = () => {
  const { id: pacienteId } = useParams();
  const [estudios, setEstudios] = useState([]);
  const [graficoAnalisis, setGraficoAnalisis] = useState([]);
  const [graficoEcografias, setGraficoEcografias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeInfo, setMensajeInfo] = useState("");
  const [error, setError] = useState(null);
  const [tratamientoLabel, setTratamientoLabel] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      if (!pacienteId) {
        setError("ID de paciente no definido.");
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError(null);
        setMensajeInfo("");
        setEstudios([]);
        setGraficoAnalisis([]);
        setGraficoEcografias([]);

        // 1) Traer TODOS los tratamientos del paciente
        const tratamientosRef = collection(
          db,
          "usuarios",
          pacienteId,
          "tratamientos"
        );
        const tratamientosSnap = await getDocs(tratamientosRef);

        if (tratamientosSnap.empty) {
          setError("No hay tratamientos registrados para este paciente.");
          return;
        }

        const tratamientos = tratamientosSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        // 2) Filtrar SOLO tratamientos activos (nuevo modelo)
        const activos = tratamientos.filter(
          (t) => String(t.estado || "").toLowerCase() === "activo"
        );

        if (activos.length === 0) {
          setError("No hay un tratamiento activo el cual analizar.");
          return;
        }

        // 3) Si hubiera más de uno activo (raro), tomar el más reciente
        const ordenarPorFecha = (lista) =>
          [...lista].sort((a, b) => {
            const fa =
              parseFecha(a.fechaInicio) ||
              parseFecha(a.createdAt) ||
              new Date(0);
            const fb =
              parseFecha(b.fechaInicio) ||
              parseFecha(b.createdAt) ||
              new Date(0);
            return fb - fa; // más nuevo primero
          });

        const tratamientoSeleccionado = ordenarPorFecha(activos)[0];

        if (!tratamientoSeleccionado) {
          setError("No se pudo determinar el tratamiento activo.");
          return;
        }

        const tLabel =
          tratamientoSeleccionado.tipoTratamiento ||
          tratamientoSeleccionado.tipo ||
          "Tratamiento activo";

        setTratamientoLabel(tLabel);

        // 4) Cargar estudios del tratamiento ACTIVO
        // 👉 NUEVO MODELO: campo array `estudiosClinicos` dentro del doc de tratamiento
        const estudiosArrayRaw = Array.isArray(
          tratamientoSeleccionado.estudiosClinicos
        )
          ? tratamientoSeleccionado.estudiosClinicos
          : [];

        if (estudiosArrayRaw.length === 0) {
          setMensajeInfo(
            `Hay un tratamiento activo (${tLabel}), pero todavía no se han cargado análisis ni ecografías para este ciclo.`
          );
          return;
        }

        // Normalizamos para tener siempre un id
        const data = estudiosArrayRaw.map((est, idx) => ({
          id: est.id || `est_${idx}`,
          ...est,
        }));

        // 5) Separar en análisis y ecografías
        const analisis = data.filter(
          (e) => normalizarTipoEstudio(e.tipoEstudio) === "analisis"
        );
        const ecografias = data.filter(
          (e) => normalizarTipoEstudio(e.tipoEstudio) === "ecografia"
        );

        // 6) Armar data para gráficos
        const grafico1 = analisis
          .map((e) => {
            const fechaDate = parseFecha(e.fecha || e.createdAt);
            const etiquetaFecha = fechaDate
              ? fechaDate.toLocaleDateString()
              : "Sin fecha";

            return {
              fecha: etiquetaFecha,
              estradiol: toNumeroValido(e.estradiol),
              progesterona: toNumeroValido(e.progesterona),
              lh: toNumeroValido(e.lh),
            };
          })
          .sort((a, b) => {
            const parseLabel = (label) => {
              const partes = label.split("/");
              if (partes.length !== 3) return new Date(0);
              const [dia, mes, anio] = partes;
              return new Date(
                parseInt(anio, 10),
                parseInt(mes, 10) - 1,
                parseInt(dia, 10)
              );
            };
            return parseLabel(a.fecha) - parseLabel(b.fecha);
          });

        const grafico2 = ecografias
          .map((e) => {
            const fechaDate = parseFecha(e.fecha || e.createdAt);
            const etiquetaFecha = fechaDate
              ? fechaDate.toLocaleDateString()
              : "Sin fecha";

            return {
              fecha: etiquetaFecha,
              total: toNumeroValido(e.recuentoFolicularTotal),
              derecho: toNumeroValido(e.ovarioDerecho),
              izquierdo: toNumeroValido(e.ovarioIzquierdo),
            };
          })
          .sort((a, b) => {
            const parseLabel = (label) => {
              const partes = label.split("/");
              if (partes.length !== 3) return new Date(0);
              const [dia, mes, anio] = partes;
              return new Date(
                parseInt(anio, 10),
                parseInt(mes, 10) - 1,
                parseInt(dia, 10)
              );
            };
            return parseLabel(a.fecha) - parseLabel(b.fecha);
          });

        setEstudios(data);
        setGraficoAnalisis(grafico1);
        setGraficoEcografias(grafico2);
      } catch (err) {
        console.error("❌ Error al cargar estudios:", err);
        setError("Error al cargar los estudios. Ver consola.");
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [pacienteId]);

  const calcularPromedio = (campo) => {
    const valores = estudios
      .map((e) => toNumeroValido(e[campo]))
      .filter((v) => v !== null);

    if (valores.length === 0) return "-";
    const total = valores.reduce((acc, v) => acc + v, 0);
    return (total / valores.length).toFixed(1);
  };

  const calcularUltimaFecha = () => {
    if (estudios.length === 0) return "-";
    const fechas = estudios
      .map((e) => parseFecha(e.fecha || e.createdAt))
      .filter(Boolean);
    if (fechas.length === 0) return "-";
    const ultima = fechas.sort((a, b) => b - a)[0];
    return ultima.toLocaleDateString();
  };

  const calcularFrecuenciaPorTipo = (tipoBuscado) => {
    const diasUnicos = Array.from(
      new Set(
        estudios
          .filter(
            (e) => normalizarTipoEstudio(e.tipoEstudio) === tipoBuscado
          )
          .map((e) => {
            const f = parseFecha(e.fecha || e.createdAt);
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
    "createdAt",
    "tratamientoId",
  ];

  const mostrarCreador = (est) => {
    if (est.cargadoPorNombre) {
      return (
        <p className="autor-carga">Cargado por: {est.cargadoPorNombre}</p>
      );
    }
    if (est.creadoPor === "medico") {
      return <p className="autor-carga">Cargado por: el médico</p>;
    }
    if (est.creadoPor === "paciente") {
      return <p className="autor-carga">Cargado por: la paciente</p>;
    }
    return null;
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
      <div className="header-analisis">
        <h3>Análisis y evolución del tratamiento</h3>
        {tratamientoLabel && !error && (
          <p className="tag-tratamiento">
            Tratamiento analizado: <strong>{tratamientoLabel}</strong>
          </p>
        )}
      </div>

      {cargando && <p>Cargando estudios...</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      {!cargando && !error && mensajeInfo && <p>{mensajeInfo}</p>}

      {/* Cards de estudios */}
      {!error && estudios.length > 0 && (
        <div className="cards-estudios">
          {estudios.map((est) => {
            const tipoLabel = etiquetaTipoEstudio(est.tipoEstudio);
            const fecha = parseFecha(est.fecha || est.createdAt);

            return (
              <div className="card-estudio" key={est.id}>
                <strong>{tipoLabel}</strong>
                <p>
                  Fecha: {fecha ? fecha.toLocaleDateString() : "Sin fecha"}
                </p>

                {est.creadoEn && (
                  <p className="creado-en">
                    Creado el: {formatearCreadoEn(est.creadoEn)}
                  </p>
                )}

                <ul>
                  {Object.entries(est).map(([clave, valor]) => {
                    if (camposExcluidos.includes(clave)) return null;

                    if (
                      valor === null ||
                      valor === undefined ||
                      valor === "" ||
                      (typeof valor === "string" && valor.trim() === "")
                    ) {
                      return null;
                    }

                    return (
                      <li key={clave}>{`${formatearClave(
                        clave
                      )}: ${valor}`}</li>
                    );
                  })}
                </ul>

                {mostrarCreador(est)}
                {est.archivoURL && (
                  <a
                    href={est.archivoURL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver archivo
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Gráfico de hormonas */}
      {!error && graficoAnalisis.length > 0 && (
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
                name="Estradiol"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="progesterona"
                name="Progesterona"
                connectNulls
              />
              <Line type="monotone" dataKey="lh" name="LH" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Gráfico de ecografías */}
      {!error && graficoEcografias.length > 0 && (
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
                name="Recuento total"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="derecho"
                name="Ovario derecho"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="izquierdo"
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
          Promedio Recuento Folicular:{" "}
          {calcularPromedio("recuentoFolicularTotal")}
        </div>
        <div>Último estudio: {calcularUltimaFecha()}</div>
        <div>
          Frecuencia de análisis clínicos:{" "}
          {calcularFrecuenciaPorTipo("analisis")}
        </div>
        <div>
          Frecuencia de ecografías: {calcularFrecuenciaPorTipo("ecografia")}
        </div>
      </div>
    </div>
  );
};

export default AnalisisYEvolucion;
