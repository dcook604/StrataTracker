import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeLogRocket } from "./lib/logrocket";

// Initialize LogRocket before rendering the app
initializeLogRocket();

createRoot(document.getElementById("root")!).render(<App />);
