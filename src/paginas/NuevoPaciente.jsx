// NuevoPaciente.jsx

import "./NuevoPaciente.scss";

import React, { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

import FormularioInfoPaciente from "../componentes/FormularioInfoPaciente";
import Loader from "../componentes/Loader";
import { app } from "../firebase";

const NuevoPaciente = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    email: "",
  });

  const [formularioExtendido, setFormularioExtendido] = useState(false);
  const [uidPaciente, setUidPaciente] = useState(null);
   const [loading, setLoading] = useState(false); // 👈 Nuevo estado
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCrearCuenta = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true); // 👈 Mostrar loader

    const cleanedFormData = {
      ...formData,
      email: formData.email.trim(),
      dni: formData.dni.trim(),
    };

    if (!cleanedFormData.email || !cleanedFormData.dni) {
      setErrorMsg("⚠️ Completá el email y el DNI antes de continuar.");
      setLoading(false);
      return;
    }

    try {
      const functions = getFunctions(app);
      const crearPacienteBasico = httpsCallable(functions, "crearPacienteBasico");
      const result = await crearPacienteBasico(cleanedFormData);

      if (result.data.success) {
        alert("✅ Cuenta creada exitosamente. Ahora completá el perfil.");
        setUidPaciente(result.data.uid);
        setFormularioExtendido(true);
      } else {
        setErrorMsg("❌ " + (result.data.error || "Error desconocido"));
      }
    } catch (error) {
      console.error("Error llamando a crearPacienteBasico:", error);
      setErrorMsg("❌ " + (error.message || "Error inesperado al crear la cuenta."));
    } finally {
      setLoading(false); // 👈 Ocultar loader
    }
  };


  return (
    <div className={`nuevo-paciente ${formularioExtendido ? "expandido" : ""}`}>
      {!formularioExtendido ? (
        <form onSubmit={handleCrearCuenta} className="formulario">
          <h2>Crear nueva cuenta de paciente</h2>
          <input type="text" name="nombre" placeholder="Nombre" value={formData.nombre} onChange={handleChange} required />
          <input type="text" name="apellido" placeholder="Apellido" value={formData.apellido} onChange={handleChange} required />
          <input type="text" name="dni" placeholder="DNI" value={formData.dni} onChange={handleChange} required />
          <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <button type="submit">CREAR</button>

          {loading && <Loader />} {/* 👈 Loader visible durante envío */}
          {errorMsg && <p className="error-msg">{errorMsg}</p>} {/* 👈 Error detallado */}
          
        </form>
      ) : (
        <div className="formulario-extendido">
          <FormularioInfoPaciente uidPaciente={uidPaciente} dniPaciente={formData.dni} />
        </div>
      )}
    </div>
  );
};

export default NuevoPaciente;
