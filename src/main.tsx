import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Catch any JS errors before React mounts and show them on screen
window.addEventListener('error', (e) => {
  const root = document.getElementById('root')
  if (root) root.innerHTML = `<div style="color:#f3e9d5;padding:24px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-all">ERROR:\n${e.message}\n\n${e.filename}:${e.lineno}\n\n${e.error?.stack ?? ''}</div>`
})
window.addEventListener('unhandledrejection', (e) => {
  const root = document.getElementById('root')
  if (root) root.innerHTML = `<div style="color:#f3e9d5;padding:24px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-all">UNHANDLED:\n${e.reason}</div>`
})

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e: any) {
  const root = document.getElementById('root')
  if (root) root.innerHTML = `<div style="color:#f3e9d5;padding:24px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-all">RENDER ERROR:\n${e?.message}\n\n${e?.stack}</div>`
}
