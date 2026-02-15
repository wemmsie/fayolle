import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

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
