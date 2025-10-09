import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./index.css";
// 导入测试工具（在控制台中可用）
import "./utils/testDeepL";

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
        <Analytics
          mode={import.meta.env.DEV ? 'development' : 'production'}
          debug={import.meta.env.DEV}
        />
        <SpeedInsights
          debug={import.meta.env.DEV}
        />
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

  // 忽略Thirdweb的DOM操作错误（非关键）
  if (event.error?.message?.includes('insertBefore') ||
      event.error?.message?.includes('Node')) {
    event.preventDefault();
    console.warn('⚠️ Suppressed non-critical DOM error');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);

  // 忽略Thirdweb相关的Promise rejection
  if (event.reason?.message?.includes('insertBefore') ||
      event.reason?.message?.includes('Node')) {
    event.preventDefault();
    console.warn('⚠️ Suppressed non-critical promise rejection');
  }
});

renderApp();
