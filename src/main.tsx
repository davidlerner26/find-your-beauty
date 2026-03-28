import { lazy, StrictMode, Suspense } from 'react';
import { createRoot, type Container } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from './store/store';
import './utils/firebase/firebase.utils';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from './utils/stripe/stripe.utils';
import './main.scss';
import { Spinner } from './components/spinner/spinner.component';
import { Wrapper } from './components/wrapper/wrapper.component';

const Welcome = lazy(() => import('./routes/welcome/welcome.component'));
const Professionals = lazy(
  () => import('./routes/professionals/professionals.component'),
);
const SignIn = lazy(() => import('./routes/sign-in/sign-in.component'));
const SignUp = lazy(() => import('./routes/sign-up/sign-up.component'));
const Admin = lazy(() => import('./routes/admin/admin.component'));

createRoot(document.getElementById('root') as Container).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <Elements stripe={stripePromise}>
            <Suspense fallback={<Spinner />}>
              <Routes>
                <Route path="/" element={<Wrapper />}>
                  <Route index element={<Welcome />} />
                  <Route path="professionals" element={<Professionals />} />
                  <Route path="sign-in" element={<SignIn />} />
                  <Route path="sign-up" element={<SignUp />} />
                  <Route path="admin" element={<Admin />} />
                </Route>
              </Routes>
            </Suspense>
          </Elements>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>,
);
