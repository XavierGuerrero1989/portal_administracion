// src/paginas/login.jsx

import "./login.scss";

import React, { useState } from "react";

import Loader from "../componentes/Loader";
import Logo from "../assets/imagenes/logo.png";
import LogoLab from "../assets/imagenes/logolab.png"; // NUEVO
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";

const Login = () => {
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, clave);
      const user = userCredential.user;

      const userDocRef = doc(db, "usuarios", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setError("El usuario no tiene rol asignado. Contacte al administrador.");
        await signOut(auth);
        return;
      }

      const userData = userDocSnap.data();

      if (userData.role !== "medico") {
        setError("Acceso denegado. Solo personal autorizado puede ingresar.");
        await signOut(auth);
        return;
      }

      navigate("/dashboard");

    } catch (err) {
      console.error("Error de login:", err);
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {loading ? (
        <Loader />
      ) : (
        <form className="login-form" onSubmit={handleLogin}>
          {/* NUEVA IMAGEN DEL LABORATORIO */}
          <img src={LogoLab} alt="Laboratorio" className="login-lab" />

          {/* LOGO PRINCIPAL */}
          <img src={Logo} alt="Logo" className="login-logo" />

          <h2>Ingreso al Portal Médico</h2>

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />

          <button type="submit" className="btn-login">Ingresar</button>

          {error && <p className="login-error">{error}</p>}

          <p className="recuperar" onClick={() => navigate("/recuperar-clave")}>
            ¿Olvidaste tu contraseña?
          </p>
        </form>
      )}
    </div>
  );
};

export default Login;
