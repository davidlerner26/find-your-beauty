import { Outlet } from 'react-router';
import { Navigation } from '../Navigation/Navigation.component';
import './wrapper.styles.scss';

export const Wrapper = () => {
  return (
    <>
      <Navigation />
      <main>
        <Outlet />
      </main>
    </>
  );
};
