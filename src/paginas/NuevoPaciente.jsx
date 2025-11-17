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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [showSuccessModal, setShowSuccessModal] = useState(false); // modal “Cuenta creada”

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCrearCuenta = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

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

      if (result.data && result.data.success) {
        // ✅ Cuenta creada correctamente
        setUidPaciente(result.data.uid);
        setFormularioExtendido(true);
        setShowSuccessModal(true); // Abrimos modal con instrucciones
      } else {
        setErrorMsg(
          "❌ " +
            (result.data?.error ||
              "Ocurrió un error desconocido al crear la cuenta.")
        );
      }
    } catch (error) {
      console.error("Error llamando a crearPacienteBasico:", error);
      setErrorMsg(
        "❌ " +
          (error.message || "Error inesperado al crear la cuenta de paciente.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
  };

  return (
    <div className={`nuevo-paciente ${formularioExtendido ? "expandido" : ""}`}>
      {!formularioExtendido ? (
        <form onSubmit={handleCrearCuenta} className="formulario">
          <h2>Crear nueva cuenta de paciente</h2>

          <input
            type="text"
            name="nombre"
            placeholder="Nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="apellido"
            placeholder="Apellido"
            value={formData.apellido}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="dni"
            placeholder="DNI"
            value={formData.dni}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creando..." : "CREAR"}
          </button>

          {loading && <Loader />}

          {errorMsg && <p className="error-msg">{errorMsg}</p>}
        </form>
      ) : (
        <div className="formulario-extendido">
          <FormularioInfoPaciente
            uidPaciente={uidPaciente}
            dniPaciente={formData.dni}
          />
        </div>
      )}

      {/* MODAL DE ÉXITO / INSTRUCCIONES PARA EL MÉDICO */}
      {showSuccessModal && (
        <div className="np-modal-overlay">
          <div className="np-modal">
            <h3>Cuenta de paciente creada</h3>

            <p>La cuenta del paciente se creó correctamente en el sistema.</p>
            <p>
              El paciente deberá descargar la app, ingresar su{" "}
              <strong>correo electrónico</strong> y usar la opción{" "}
              <strong>“Olvidé mi contraseña”</strong> para recibir un email de
              Firebase y crear su clave por primera vez.
            </p>
            <p>
              Mientras tanto, podés continuar completando el perfil clínico en
              esta pantalla.
            </p>

            <button
              type="button"
              className="np-modal-button"
              onClick={handleCloseModal}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NuevoPaciente;
