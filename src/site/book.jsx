import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@phosphor-icons/web/duotone';
import './site.css';
import App from './App.jsx';

// Booking-only page (book.html): header, booking form and footer.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App view="book" />
  </StrictMode>,
);
