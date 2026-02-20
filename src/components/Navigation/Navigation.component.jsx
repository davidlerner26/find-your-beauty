import { NavLink } from 'react-router';
import './navigation.styles.scss';
import Logo from '../../assets/svg/logo.svg?react';
import { useContext } from 'react';
import { UserContext } from '../../contexts/user.context';
import { Button } from '@mui/material';
import { signOutUser } from '../../utils/firebase/firebase.utils';

export const Navigation = () => {
  const { isUserLoggedIn } = useContext(UserContext);

  return (
    <nav className="nav">
      <div>
        <NavLink to="/">
          <Logo className="nav-logo" />
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
    </nav>
  );
};
