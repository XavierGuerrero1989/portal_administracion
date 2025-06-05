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
        const tratamientoActivoRef = collection(db, "usuarios", docUsuario.id, "tratamientos");
        const subDocs = await getDocs(tratamientoActivoRef);

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
    const texto = `${t.nombre} ${t.apellido} ${t.dni} ${t.tipo} ${t.fechaInicio?.toDate?.().toLocaleDateString() || ""}`.toLowerCase();
    return texto.includes(busqueda.toLowerCase());
  });

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
                  <td>{t.nombre} {t.apellido}</td>
                  <td>{t.dni}</td>
                  <td>{t.tipo}</td>
                  <td>{t.fechaInicio?.toDate?.().toLocaleDateString() || "-"}</td>
                  <td>{t.estado || (t.tratamientoId === "activo" ? "Activo" : "Finalizado")}</td>
                  <td>
                    {[t.fsh?.medicamento, t.hmg?.medicamento].filter(Boolean).join(" + ") || "-"}
                  </td>
                  <td>
                    <Link className="ver-detalle" to={`/tratamientos/${t.idUsuario}/${t.tratamientoId}`}>
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
