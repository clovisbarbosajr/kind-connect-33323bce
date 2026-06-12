import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PublicView } from "./Public";
import "./styles.css";

// PUBLIC page (/worldcup/). Viewers only watch what the admin is airing.
// No login / admin code is bundled here.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PublicView />
  </StrictMode>,
);
