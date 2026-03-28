import { NavLink } from 'react-router';
import { FC, useEffect } from 'react';
import { Button } from '@mui/material';
import { auth, signOutUser } from '../../utils/firebase/firebase.utils';
import { Nav, NavLinkItem, NavLinkLogo } from './navigation.styles';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsUserLoggedIn } from '../../store/user/user.selector';
import { setIsUserLoggedIn } from '../../store/user/user.reducer';
import { onAuthStateChanged } from 'firebase/auth';

const Navigation: FC = () => {
  const isUserLoggedIn = useSelector(selectIsUserLoggedIn);
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch(setIsUserLoggedIn(user ? true : false));
    });

    return unsubscribe;
  }, []);

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
