import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.styles.scss'
import {App} from './App.component.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
