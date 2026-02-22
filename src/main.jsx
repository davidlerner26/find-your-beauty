import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Wrapper } from './components/wrapper/wrapper.component';
import './index.scss';
import { SignIn } from './routes/sign-in/sign-in.component';
import { SignUp } from './routes/sign-up/sign-up.component';
import './utils/firebase/firebase.utils';
import { UserProvider } from './contexts/user.context';
import { Admin } from './routes/admin/admin.component';
import { Provider } from 'react-redux';
import { persistor, store } from './store/store';
import { Home } from './routes/home/home.component';
import { SearchResults } from './routes/search-results/search-results.component';
import { PersistGate } from 'redux-persist/integration/react';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <UserProvider>
            <Routes>
              <Route path="/" element={<Wrapper />}>
                <Route index element={<Home />} />
                <Route path="professionals" element={<SearchResults />} />
                <Route path="sign-in" element={<SignIn />} />
                <Route path="sign-up" element={<SignUp />} />
                <Route path="admin" element={<Admin />} />
              </Route>
            </Routes>
          </UserProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </StrictMode>,
);
