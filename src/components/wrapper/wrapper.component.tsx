import { Outlet } from 'react-router';
import { Navigation } from '../navigation/navigation.component';
import { Main } from './wrapper.styles';

export const Wrapper = () => {
  return (
    <>
      <Navigation />
      <Main>
        <Outlet />
      </Main>
    </>
  );
};
