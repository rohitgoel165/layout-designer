// Import your Figma global styles
import './styles/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initAuthFromUrl } from './auth'

// Default Vite CSS import
import './index.css'


// Initialize auth from URL (token/org) before rendering
try { initAuthFromUrl(); } catch {}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
