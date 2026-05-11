import { hydrateRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

hydrateRoot(document.getElementById("root")!, <App />);
