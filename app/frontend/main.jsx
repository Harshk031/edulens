import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme-premium.css'
import './styles/theme.css'
import './styles/animations.css'
import App from './App.jsx'

// Suppress irrelevant YouTube CORS errors
const originalError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  // Filter out YouTube/Google ads CORS errors
  if (message.includes('googleads.g.doubleclick.net') || 
      (message.includes('CORS policy') && message.includes('youtube.com'))) {
    return; // Suppress these errors
  }
  originalError.apply(console, args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
