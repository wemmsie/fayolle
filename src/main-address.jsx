import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import AddressPage from './AddressPage.jsx';

function AddressPageWithScroll() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return <AddressPage />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AddressPageWithScroll />
  </React.StrictMode>,
);
