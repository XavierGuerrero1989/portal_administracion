// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Header from "./componentes/Header";
import Dashboard from "./paginas/Dashboard";
import Pacientes from "./paginas/Pacientes";
import Tratamientos from "./paginas/Tratamientos";
import Estudios from "./paginas/Estudios";
import Login from "./paginas/login";

import "./App.scss";

const App = () => {
  return (
    
      <div className="app-container">
        <Routes>
          {/* LOGIN */}
          <Route path="/" element={<Login />} />

          {/* ZONA PRIVADA */}
          <Route
            path="/dashboard"
            element={
              <>
                <Header />
                <div className="main-content">
                  <Dashboard />
                </div>
              </>
            }
          />
          <Route
            path="/pacientes"
            element={
              <>
                <Header />
                <div className="main-content">
                  <Pacientes />
                </div>
              </>
            }
          />
          <Route
            path="/tratamientos"
            element={
              <>
                <Header />
                <div className="main-content">
                  <Tratamientos />
                </div>
              </>
            }
          />
          <Route
            path="/estudios"
            element={
              <>
                <Header />
                <div className="main-content">
                  <Estudios />
                </div>
              </>
            }
          />

          {/* Cualquier ruta desconocida -> redirige a login */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    
  );
};

export default App;
