import React from "react";
import Header from "./Header";
import Footer from "./Footer";
import "./LayoutPrivado.scss";

const LayoutPrivado = ({ children }) => {
  return (
    <div className="layout-privado">
      <Header />
      <div className="main-content">{children}</div>
      <Footer />
    </div>
  );
};

export default LayoutPrivado;
