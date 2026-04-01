import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { NotificationProvider } from './components/NotificationProvider'

// Apply persisted theme immediately to prevent flash
try {
  const stored = JSON.parse(localStorage.getItem('eco-stream-theme') || '{}');
  if (stored?.state?.mode) {
    document.documentElement.setAttribute('data-theme', stored.state.mode);
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <NotificationProvider>
    <App />
  </NotificationProvider>
)
