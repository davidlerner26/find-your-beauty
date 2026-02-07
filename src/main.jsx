import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Wrapper } from './components/wrapper/wrapper.component';
import './index.scss';
import { Home } from './routes/home/home.component';
import { SignIn } from './routes/sign-in/sign-in.component';
import { SignUp } from './routes/sign-up/sign-up.component';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Wrapper />}>
          <Route index element={<Home />} />
          <Route path="sign-in" element={<SignIn />} />
          <Route path="sign-up" element={<SignUp />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
