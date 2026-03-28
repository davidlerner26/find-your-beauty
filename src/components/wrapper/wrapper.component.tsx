import { Outlet } from 'react-router';
import Navigation from '../navigation/navigation.component';
import { Main } from './wrapper.styles';
import { FC } from 'react';

export const Wrapper: FC = () => {
  return (
    <>
      <Navigation />
      <Main>
        <Outlet />
      </Main>
    </>
  );
};
