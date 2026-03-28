import { createSlice } from '@reduxjs/toolkit';

export const USER_INITIAL_STATE = {
  isUserLoggedIn: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState: USER_INITIAL_STATE,
  reducers: {
    setIsUserLoggedIn(state, action) {
      state.isUserLoggedIn = action.payload;
    },
  },
});

export const { setIsUserLoggedIn } = userSlice.actions;

export const userReducer = userSlice.reducer;
