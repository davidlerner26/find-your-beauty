import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router';
import { PersistGate } from 'redux-persist/integration/react';
import { Wrapper } from './components/wrapper/wrapper.component';
import { UserProvider } from './contexts/user.context';
import './index.scss';
import { Admin } from './routes/admin/admin.component';
import Home from './routes/home/home.component';
import { Professionals } from './routes/professionals/professionals.component';
import { SignIn } from './routes/sign-in/sign-in.component';
import { SignUp } from './routes/sign-up/sign-up.component';
import { persistor, store } from './store/store';
import './utils/firebase/firebase.utils';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from './utils/stripe/stripe.utils';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Elements stripe={stripePromise}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <BrowserRouter>
            <UserProvider>
              <Routes>
                <Route path="/" element={<Wrapper />}>
                  <Route index element={<Home />} />
                  <Route path="professionals" element={<Professionals />} />
                  <Route path="sign-in" element={<SignIn />} />
                  <Route path="sign-up" element={<SignUp />} />
                  <Route path="admin" element={<Admin />} />
                </Route>
              </Routes>
            </UserProvider>
          </BrowserRouter>
        </PersistGate>
      </Provider>
    </Elements>
  </StrictMode>,
);
