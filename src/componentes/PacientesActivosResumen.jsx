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
      setLoading(true);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const lista = [];

      try {
        for (const docUsuario of usuariosDocs) {
          const usuarioData = docUsuario.data();

          const tratamientosSnap = await getDocs(
            collection(db, `usuarios/${docUsuario.id}/tratamientos`)
          );

          tratamientosSnap.forEach((tratDoc) => {
            const trat = tratDoc.data();

            // ✅ NUEVA LÓGICA: solo tratamientos con estado === "activo"
            const estado = String(trat.estado || "").toLowerCase();
            const esActivo = estado === "activo";
            if (!esActivo) return;

            // Fecha de inicio del tratamiento
            let fechaInicio = null;
            if (trat.fechaInicio?.toDate) {
              fechaInicio = trat.fechaInicio.toDate();
            } else if (trat.fechaInicio?.seconds) {
              fechaInicio = new Date(trat.fechaInicio.seconds * 1000);
            } else if (trat.fechaInicio) {
              const f = new Date(trat.fechaInicio);
              if (!isNaN(f.getTime())) fechaInicio = f;
            } else if (trat.createdAt?.toDate) {
              // fallback suave si no hay fechaInicio
              fechaInicio = trat.createdAt.toDate();
            }

            let diaActual = "-";
            if (fechaInicio) {
              const diffMs = hoy - fechaInicio;
              if (!isNaN(diffMs)) {
                diaActual = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
              }
            }

            // 💊 Recolectar drogas
            const drogas = [];
            const pushNombre = (med) => {
              if (!med || typeof med !== "object") return;
              const nombre =
                med.nombre ||
                med.medicamento ||
                med.nombreComercial ||
                null;
              if (nombre && !drogas.includes(nombre)) drogas.push(nombre);
            };

            // 👉 Modelo nuevo: medicamentosPlanificados (array de objetos)
            if (trat.medicamentosPlanificados) {
              const fuente = Array.isArray(trat.medicamentosPlanificados)
                ? trat.medicamentosPlanificados
                : [trat.medicamentosPlanificados];
              fuente.forEach(pushNombre);
            }

            // 🔁 Compatibilidad suave: campos viejos (por si hay tratamientos antiguos aún marcados activos)
            ["fsh", "hmg", "antagonista", "viaOral"].forEach((key) => {
              const val = trat[key];
              if (!val) return;
              const arr = Array.isArray(val) ? val : [val];
              arr.forEach(pushNombre);
            });

            lista.push({
              nombre: `${usuarioData.nombre || ""} ${
                usuarioData.apellido || ""
              }`.trim() || "Sin nombre",
              fechaInicio: fechaInicio ? fechaInicio.toLocaleDateString() : "-",
              tipo:
                trat.tipoTratamiento ||
                trat.tipo ||
                "Tratamiento sin tipo",
              diagnostico: trat.diagnostico || "No especificado",
              dia: diaActual,
              drogas,
            });
          });
        }

        // Orden opcional: por días de tratamiento descendente (más avanzados primero)
        const listaOrdenada = [...lista].sort((a, b) => {
          const da = isNaN(parseInt(a.dia)) ? 0 : parseInt(a.dia);
          const db = isNaN(parseInt(b.dia)) ? 0 : parseInt(b.dia);
          return db - da;
        });

        setPacientes(listaOrdenada);
      } catch (err) {
        console.error("❌ Error al cargar pacientes activos:", err);
        setPacientes([]);
      } finally {
        setLoading(false);
      }
    };

    if (usuariosDocs && usuariosDocs.length > 0) {
      fetchPacientesActivos();
    } else {
      setPacientes([]);
      setLoading(false);
    }
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
                <span>
                  📅 Inicio: {p.fechaInicio} — Días desde estímulo: {p.dia}
                </span>

                <span>🧬 Tipo de tratamiento: {p.tipo}</span>

                <span>🩺 Diagnóstico: {p.diagnostico}</span>

                <span>
                  💊 Drogas:{" "}
                  {p.drogas.length ? p.drogas.join(", ") : "Ninguna"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PacientesActivosResumen;

