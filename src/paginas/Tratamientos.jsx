import React, { useEffect, useState } from "react";
import "./Tratamientos.scss";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Search, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const Tratamientos = () => {
  const [tratamientos, setTratamientos] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const cargarTratamientos = async () => {
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const tratamientosData = [];

      for (const docUsuario of usuariosSnap.docs) {
        const usuario = docUsuario.data();
        const tratamientosRef = collection(
          db,
          "usuarios",
          docUsuario.id,
          "tratamientos"
        );
        const subDocs = await getDocs(tratamientosRef);

        for (const subDoc of subDocs.docs) {
          const tratamiento = subDoc.data();
          tratamientosData.push({
            idUsuario: docUsuario.id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            dni: usuario.dni,
            tratamientoId: subDoc.id,
            ...tratamiento,
          });
        }
      }

      setTratamientos(tratamientosData);
    };

    cargarTratamientos();
  }, []);

  const tratamientosFiltrados = tratamientos.filter((t) => {
    const fechaTexto =
      t.fechaInicio?.toDate?.().toLocaleDateString() || "";
    const texto = `${t.nombre} ${t.apellido} ${t.dni} ${t.tipo} ${fechaTexto}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

  // --- NUEVO: helper para obtener nombres de medicamentos de forma genérica ---
  const obtenerNombresMedicamentos = (t) => {
    const nombres = [];

    // 1) medicamentosPlanificados (caso Salvador)
    if (t.medicamentosPlanificados) {
      const fuente = Array.isArray(t.medicamentosPlanificados)
        ? t.medicamentosPlanificados
        : [t.medicamentosPlanificados];

      fuente.forEach((m) => {
        if (!m || typeof m !== "object") return;
        const nombre =
          m.nombre || m.medicamento || m.nombreComercial || null;
        if (nombre) nombres.push(nombre);
      });
    }

    // 2) otros tipos: fsh, hmg, antagonista, viaOral (casos viejos y nuevos)
    const tipos = ["fsh", "hmg", "antagonista", "viaOral"];
    tipos.forEach((key) => {
      const val = t[key];
      if (!val) return;
      const arr = Array.isArray(val) ? val : [val];

      arr.forEach((m) => {
        if (!m || typeof m !== "object") return;
        const nombre =
          m.nombre || m.medicamento || m.nombreComercial || null;
        if (nombre) nombres.push(nombre);
      });
    });

    return nombres.length ? nombres.join(" + ") : "-";
  };

  return (
    <div className="tratamientos">
      <h2>Listado de Tratamientos</h2>

      <div className="barra-busqueda">
        <Search size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI o fecha..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="tabla-tratamientos">
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>DNI</th>
              <th>Tipo</th>
              <th>Inicio</th>
              <th>Estado</th>
              <th>Medicamentos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tratamientosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7">No hay tratamientos que coincidan.</td>
              </tr>
            ) : (
              tratamientosFiltrados.map((t, i) => (
                <tr key={i}>
                  <td>
                    {t.nombre} {t.apellido}
                  </td>
                  <td>{t.dni}</td>
                  <td>{t.tipo}</td>
                  <td>
                    {t.fechaInicio?.toDate?.().toLocaleDateString() || "-"}
                  </td>
                  <td>
                    {t.estado ||
                      (t.tratamientoId === "activo"
                        ? "Activo"
                        : "Finalizado")}
                  </td>
                  <td>{obtenerNombresMedicamentos(t)}</td>
                  <td>
                    <Link
                      className="ver-detalle"
                      to={`/tratamientos/${t.idUsuario}/${t.tratamientoId}`}
                    >
                      <Eye size={16} /> Ver detalle
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tratamientos;
