import { Outlet } from 'react-router';
import { Navigation } from '../Navigation/Navigation.component';
import './wrapper.styles.scss';
import { UserContext } from '../../contexts/user-context';
import { useContext } from 'react';

export const Wrapper = () => {
  const user = useContext(UserContext);

  return (
    <>
      <UserContext value={user}>
        <Navigation />
        <main>
          <Outlet />
        </main>
      </UserContext>
    </>
  );
};
