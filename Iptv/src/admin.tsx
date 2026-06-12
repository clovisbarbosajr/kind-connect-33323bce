import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "./AdminPage";
import "./styles.css";

// ADMIN page (/worldcup/admin.html). Key-gated. Not linked from the public page.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
);
