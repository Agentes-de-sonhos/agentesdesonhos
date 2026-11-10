import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import CruiseShipsPreview from '../../src/pages/whitelabel/CruiseShipsPreview';
import './preview.css';
createRoot(document.getElementById('root')!).render(<BrowserRouter><CruiseShipsPreview /></BrowserRouter>);
