import { hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./app/App.tsx";
import "./styles/index.css";
import { initClarity } from "./lib/clarity";

initClarity();

hydrateRoot(
  document.getElementById("root")!,
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
