import { createContext } from 'react';

export const UserContext = createContext({
  isUserLoggedIn: false,
  setIsUserLoggedIn: () => {},
});
