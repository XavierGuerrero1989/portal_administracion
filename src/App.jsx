import "./App.scss";

import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";

import Dashboard from "./paginas/Dashboard";
import Estudios from "./paginas/Estudios";
import Header from "./componentes/Header";
import Login from "./paginas/login";
import NuevoPaciente from "./paginas/NuevoPaciente";
import Pacientes from "./paginas/Pacientes";
import PerfilPaciente from "./paginas/PerfilPaciente";
import PrivateRoute from "./componentes/PrivateRoute";
import React from "react";
import Tratamientos from "./paginas/Tratamientos";
import AnalisisYEvolucion from "./paginas/AnalisisYEvolucion";
import HistorialPaciente from "./paginas/HistorialPaciente";

const App = () => {
  return (
    <div className="app-container">
      <Routes>
        {/* LOGIN (pública) */}
        <Route path="/" element={<Login />} />

        {/* RUTAS PRIVADAS */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <>
                <Header />
                <div className="main-content">
                  <Dashboard />
                </div>
              </>
            </PrivateRoute>
          }
        />
        <Route
          path="/pacientes"
          element={
            <PrivateRoute>
              <>
                <Header />
                <div className="main-content">
                  <Pacientes />
                </div>
              </>
            </PrivateRoute>
          }
        />
        <Route
          path="/pacientes/nuevo"
          element={
            <PrivateRoute>
              <>
                <Header />
                <div className="main-content">
                  <NuevoPaciente />
                </div>
              </>
            </PrivateRoute>
          }
        />
        <Route
          path="/tratamientos"
          element={
            <PrivateRoute>
              <>
                <Header />
                <div className="main-content">
                  <Tratamientos />
                </div>
              </>
            </PrivateRoute>
          }
        />
        <Route
          path="/estudios"
          element={
            <PrivateRoute>
              <>
                <Header />
                <div className="main-content">
                  <Estudios />
                </div>
              </>
            </PrivateRoute>
          }
        />

        {/* CORREGIDA */}
        <Route
          path="/pacientes/:id/perfil"
          element={
            <PrivateRoute>
              <>
                <Header />
                <div className="main-content">
                  <PerfilPaciente />
                </div>
              </>
            </PrivateRoute>
          }
        />

        <Route
          path="/pacientes/:id/evolucion"
          element={
            <PrivateRoute>
              <>
                <Header />
                <div className="main-content">
                  <AnalisisYEvolucion />
                </div>
              </>
            </PrivateRoute>
          }
        />

        <Route
          path="/pacientes/:id/historial"
          element={
            <PrivateRoute>
              <>
                <Header />
                <div className="main-content">
                  <HistorialPaciente/>
                </div>
              </>
            </PrivateRoute>
          }
        />

        {/* RUTA DESCONOCIDA */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export default App;
