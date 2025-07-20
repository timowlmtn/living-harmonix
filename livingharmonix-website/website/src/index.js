import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import StaticContentLoader from "./StaticContentLoader.jsx";
import "leaflet/dist/leaflet.css"; // <-- your map styles

// 1. grab the <div id="root"> from your Providence index.html
const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

// 2. decide if we're on the “true” home page
//    (adjust this if your home URL is something like '/index.html' or '/US/RI/Providence/')
const isHomePage = window.location.pathname === "/";

// 3. render: Providence static content only on '/', then your App
root.render(
  <>
    {isHomePage && <StaticContentLoader />}
    <App />
  </>,
);
