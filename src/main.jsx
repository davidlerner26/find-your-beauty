import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import { BrowserRouter,Routes,Route } from "react-router";
import { Navigation } from './components/Navigation/Navigation.component.jsx';
import { Home } from './routes/Home/Home.component.jsx';
import { Profile } from './routes/Profile/Profile.component.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigation />}>
          <Route index element={<Home/>}/>
          <Route path='profile' element={<Profile/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
)
