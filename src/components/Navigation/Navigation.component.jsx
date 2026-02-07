import { NavLink, Outlet } from 'react-router';
import './navigation.styles.scss';

export const Navigation = () => {
  return (
    <>
      <nav>
        <div>
          <NavLink to="/">Logo</NavLink>
        </div>
        <div>
          <NavLink to="/">Sign In</NavLink>
          <NavLink to="/">Create an account</NavLink>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
};
