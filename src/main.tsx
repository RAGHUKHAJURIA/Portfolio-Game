import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// No StrictMode: its double-invoked effects would create the Rapier character
// controller twice per mount and re-run the instanced-mesh scatter, which is
// wasted work in a scene that is mounted exactly once for the session.
createRoot(document.getElementById('root')!).render(<App />)
