import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // DO NOT include .jsx extension
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
