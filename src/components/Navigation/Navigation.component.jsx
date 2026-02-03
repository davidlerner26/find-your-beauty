import { NavLink, Outlet } from "react-router"

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