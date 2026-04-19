import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { runMigrations } from './lib/migrations'

// Мигрируем localStorage до первого рендера, чтобы старые данные не крашили UI
runMigrations()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
