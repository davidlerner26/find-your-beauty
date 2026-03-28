import { createSelector } from 'reselect';

const selectUserReducer = (state) => state.user;

export const selectIsUserLoggedIn = createSelector(
  [selectUserReducer],
  (userSlice) => userSlice.isUserLoggedIn,
);
