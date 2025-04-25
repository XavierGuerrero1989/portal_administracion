// src/paginas/login.jsx

import "./login.scss";

import React, { useState } from "react";

import Loader from "../componentes/Loader";
import Logo from '../assets/imagenes/logo.png'
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

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
      await signInWithEmailAndPassword(auth, email, clave);
      navigate("/dashboard"); // cambiar si tu ruta principal es otra
    } catch (err) {
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
