// EstadisticasIA.jsx
import React, { useEffect, useState } from "react";
import "./EstadisticasIA.scss";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const EstadisticasIA = () => {
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerDatos = async () => {
      const snapshot = await getDocs(collection(db, "usuarios"));
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPacientes(data);
      setCargando(false);
    };
    obtenerDatos();
  }, []);

  return (
    <div className="estadisticas-ia">
      <h2>Estadísticas con IA</h2>
      {cargando ? (
        <p>Cargando pacientes...</p>
      ) : (
        <ul>
          {pacientes.map((p) => (
            <li key={p.id}>
              {p.nombre} {p.apellido} – DNI: {p.dni}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EstadisticasIA;
