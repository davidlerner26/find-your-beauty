import { NavLink } from 'react-router';
import { useContext } from 'react';
import { UserContext } from '../../contexts/user.context';
import { Button } from '@mui/material';
import { signOutUser } from '../../utils/firebase/firebase.utils';
import { Nav } from './navigation.styles';

export const Navigation = () => {
  const { isUserLoggedIn } = useContext(UserContext);

  return (
    <Nav>
      <div>
        <NavLink to="/">
          <img
            src="/logo.svg"
            alt="Find your beauty logo"
            className="nav-logo"
          />
        </NavLink>
      </div>
      <div>
        {isUserLoggedIn ? (
          <Button onClick={signOutUser}>Sign Out</Button>
        ) : (
          <>
            <NavLink className="nav-item" to="/sign-in">
              Sign In
            </NavLink>
            <NavLink className="nav-item" to="/sign-up">
              Create an account
            </NavLink>
          </>
        )}
      </div>
    </Nav>
  );
};
