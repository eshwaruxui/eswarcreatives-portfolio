import { hydrateRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./app/App.tsx";
import "./styles/index.css";

hydrateRoot(
  document.getElementById("root")!,
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
