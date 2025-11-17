// src/paginas/RecuperarClave.jsx

import "./RecuperarClave.scss";

import React, { useState } from "react";

import Loader from "../componentes/Loader";
import Logo from "../assets/imagenes/logo.png";
import LogoLab from "../assets/imagenes/logolab.png";

import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const RecuperarClave = () => {
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRecuperar = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!email.trim()) {
      setError("Por favor ingresá tu correo electrónico.");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      setMensaje(
        "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos."
      );
      setEmail("");
    } catch (err) {
      console.error("Error al enviar correo de recuperación:", err);
      // Mensaje genérico por seguridad
      setError(
        "Ocurrió un problema al enviar el correo. Verificá el email ingresado e intentá nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recovery-container">
      {loading ? (
        <Loader />
      ) : (
        <form className="recovery-form" onSubmit={handleRecuperar}>
          {/* Logo laboratorio */}
          <img src={LogoLab} alt="Laboratorio" className="recovery-lab" />

          {/* Logo principal */}
          <img src={Logo} alt="Logo" className="recovery-logo" />

          <h2>Recuperar contraseña</h2>
          <p className="recovery-text">
            Ingresá el correo con el que accedés al portal. Te enviaremos un enlace
            para que puedas restablecer tu contraseña.
          </p>

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="btn-recovery">
            Enviar enlace de recuperación
          </button>

          {mensaje && <p className="recovery-success">{mensaje}</p>}
          {error && <p className="recovery-error">{error}</p>}

          <button
            type="button"
            className="btn-volver"
            onClick={() => navigate("/")}
          >
            Volver al login
          </button>
        </form>
      )}
    </div>
  );
};

export default RecuperarClave;
