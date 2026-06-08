import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Wait for fonts + CSS to be ready before triggering hero animations
document.fonts.ready.then(() => {
  document.documentElement.classList.add('fonts-ready');
});

function AppWithScroll() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Direct deep-link (e.g. /#rsvp) — jump straight there without smooth scroll.
      const scrollToHash = () => {
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
      };
      // Run after layout settles; also re-run once fonts load in case heights shift.
      scrollToHash();
      requestAnimationFrame(scrollToHash);
      document.fonts.ready.then(scrollToHash);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithScroll />
  </React.StrictMode>,
);
