// src/componentes/Loader.jsx

import "./Loader.scss";

import Lottie from "lottie-react";
import React from "react";
import animationData from "../assets/Loader.json";

const Loader = () => {
  return (
    <div className="loader-container">
      <Lottie animationData={animationData} loop autoplay className="loader-lottie" />
      <p>Cargando...</p>
    </div>
  );
};

export default Loader;
