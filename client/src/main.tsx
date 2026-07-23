import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { hideNetlifyDrawerIfNeeded } from "./lib/previewOps";

// Deploy Preview: el drawer Collaborate de Netlify come toques en móvil.
// Redirige con ?ntl-drawer-state=hidden antes de montar React.
if (!hideNetlifyDrawerIfNeeded()) {
  const queryClient = new QueryClient();
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
