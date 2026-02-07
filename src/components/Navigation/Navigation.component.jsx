import { NavLink, Outlet } from "react-router";
import './navigation.styles.scss';

export const Navigation = () => {
    return (
        <>
            <nav>
                <NavLink to="/">Logo</NavLink>
                <NavLink to="/profile">Profile</NavLink>
            </nav>
            <Outlet/>    
        </>
    )
}