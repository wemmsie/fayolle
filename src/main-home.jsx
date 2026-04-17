import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Wait for fonts + CSS to be ready before triggering hero animations
document.fonts.ready.then(() => {
  document.documentElement.classList.add('fonts-ready');
});

function AppWithScroll() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithScroll />
  </React.StrictMode>,
);
