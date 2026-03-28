import { NavLink } from 'react-router';
import { FC, useContext } from 'react';
import { UserContext } from '../../contexts/user.context';
import { Button } from '@mui/material';
import { signOutUser } from '../../utils/firebase/firebase.utils';
import { Nav, NavLinkItem, NavLinkLogo } from './navigation.styles';

const Navigation: FC = () => {
  const { isUserLoggedIn } = useContext(UserContext);

  return (
    <Nav>
      <div>
        <NavLink to="/">
          <NavLinkLogo src="/logo.svg" alt="Find your beauty logo" />
        </NavLink>
      </div>
      <div>
        {isUserLoggedIn ? (
          <Button onClick={signOutUser}>Sign Out</Button>
        ) : (
          <>
            <NavLinkItem to="/sign-in">Sign In</NavLinkItem>
            <NavLinkItem to="/sign-up">Create an account</NavLinkItem>
          </>
        )}
      </div>
    </Nav>
  );
};

export default Navigation;
