import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import { BrowserRouter,Routes,Route } from "react-router";
import { Navigation } from './components/navigation/navigation.component';
import { Home } from './routes/home/home.component';
import { Profile } from './routes/profile/profile.component';

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
