import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./src/App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.PROD ? "/ParkMan2" : "/"}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
