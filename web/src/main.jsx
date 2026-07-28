import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// The one and only stylesheet of design values. Imported once, here.
// Everything else reads var(--*); no file below this one writes a hex, a font
// stack, or a radius of its own.
import '../../design/tokens.css';
import './styles/shell.css';

import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
