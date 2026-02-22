// GENESIS — Entry point
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Reset de estilos base
const style = document.createElement('style');
style.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100%;
    height: 100%;
  }

  body {
    font-family: 'Press Start 2P', monospace;
    background-color: #08081a;
    color: #d0c090;
    overflow-x: hidden;
  }

  /* Scrollbar personalizada */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #10102a;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb {
    background: #252555;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #353575;
  }

  /* Placeholder del input */
  input::placeholder {
    color: #706850;
    opacity: 1;
  }

  /* Focus visible */
  input:focus {
    border-color: #f0c040 !important;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
