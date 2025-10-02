import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./index.css";
// 导入测试工具（在控制台中可用）
import "./utils/testDeepL";
import "./utils/quickTest";

// Enhanced error handling for deployment stability
const renderApp = () => {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }
    
    createRoot(rootElement).render(
      <>
        <App />
        <Analytics />
        <SpeedInsights />
      </>
    );
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    
    // Fallback error display
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column;">
          <h1 style="color: #red;">Application Error</h1>
          <p>Failed to load the application. Please refresh the page.</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px;">Refresh Page</button>
        </div>
      `;
    }
  }
};

// Add global error handler for unhandled errors during startup
window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

renderApp();
