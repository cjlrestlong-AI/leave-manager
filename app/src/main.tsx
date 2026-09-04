import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@/state/AppContext';
import { LeaveEditorProvider } from '@/state/LeaveEditor';
import { App } from './App';

import './styles/tokens.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/utilities.css';
import './styles/app.css';
import './styles/components.css';
import './styles/pages.css';

const root = document.getElementById('root');
if (!root) throw new Error('找不到 #root');

createRoot(root).render(
  <StrictMode>
    <AppProvider>
      <LeaveEditorProvider>
        <App />
      </LeaveEditorProvider>
    </AppProvider>
  </StrictMode>,
);
