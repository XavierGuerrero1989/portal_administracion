// src/componentes/Loader.jsx

import "./Loader.scss";

import LottieModule from "lottie-react";
import React from "react";
import animationData from "../assets/Loader.json";

// lottie-react is published as CommonJS. With Vite 8 its default export can
// arrive wrapped one extra time, so normalize it before rendering.
const Lottie = LottieModule.default ?? LottieModule;

const Loader = () => {
  return (
    <div className="loader-container">
      <Lottie animationData={animationData} loop autoplay className="loader-lottie" />
      <p>Cargando...</p>
    </div>
  );
};

export default Loader;
