import { Outlet } from 'react-router';
import { Navigation } from '../navigation/navigation.component';
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
