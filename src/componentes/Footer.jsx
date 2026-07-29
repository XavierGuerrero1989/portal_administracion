import React from "react";
import "./Footer.scss";

const Footer = () => {
  return (
    <footer className="footer-container">
      <p>
        Esta es una web propiedad de{" "}
        <a
          href="https://www.merckgroup.com/ar-es"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          MERCK Group
        </a>
        .{" "}
        <a
          href="https://brainworks.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Desarrollado por BRÄINWORKS
        </a>
        .
      </p>
    </footer>
  );
};

export default Footer;
