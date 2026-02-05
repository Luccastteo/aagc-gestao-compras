import { useEffect, useState } from "react";
import "./App.css";

/**
 * AAGC Desktop - Thin Client
 * 
 * Este app é um cliente leve que carrega a interface web do SaaS.
 * O redirecionamento para o Next.js é feito no Rust (lib.rs).
 * Esta tela é apenas um fallback/loading enquanto o webview carrega.
 */
function App() {
  const [status, setStatus] = useState("Conectando ao AAGC SaaS...");
  
  useEffect(() => {
    // O redirecionamento é feito no Rust, mas mostramos feedback
    const timer = setTimeout(() => {
      setStatus("Carregando interface...");
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="container">
      <div className="loading-screen">
        <div className="logo">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8V4H8"/>
            <rect width="16" height="12" x="4" y="8" rx="2"/>
            <path d="M2 14h2"/>
            <path d="M20 14h2"/>
            <path d="M15 13v2"/>
            <path d="M9 13v2"/>
          </svg>
        </div>
        <h1>AAGC</h1>
        <p className="subtitle">Gestão Inteligente de Compras</p>
        <div className="spinner" aria-label="Carregando"></div>
        <p className="status">{status}</p>
      </div>
    </main>
  );
}

export default App;
