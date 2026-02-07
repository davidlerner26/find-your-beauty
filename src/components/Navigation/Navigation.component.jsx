import { NavLink } from 'react-router';
import './navigation.styles.scss';
import Logo from '../../assets/svg/logo.svg?react';

export const Navigation = () => {
  return (
    <nav className="nav">
      <div>
        <NavLink to="/">
          <Logo className="nav-logo" />
        </NavLink>
      </div>
      <div>
        <NavLink className="nav-item" to="/">
          Sign In
        </NavLink>
        <NavLink className="nav-item" to="/">
          Create an account
        </NavLink>
      </div>
    </nav>
  );
};
