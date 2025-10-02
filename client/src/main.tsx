import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, dispatch custom event
                console.log('New content is available; please refresh.');
                window.dispatchEvent(new CustomEvent('sw-update-available', {
                  detail: { registration }
                }));
              }
            });
          }
        });
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
            window.dispatchEvent(new CustomEvent('sw-update-available', {
              detail: { registration }
            }));
          }
        });
        
        // Check if there's already a waiting worker
        if (registration.waiting) {
          window.dispatchEvent(new CustomEvent('sw-update-available', {
            detail: { registration }
          }));
        }
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

console.log("React app starting to mount...");
const root = document.getElementById("root");
console.log("Root element:", root);
createRoot(root!).render(<App />);
console.log("React app rendered");
