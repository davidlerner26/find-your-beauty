import { createSlice } from '@reduxjs/toolkit';

export const INITIAL_STATE = {
  alerts: [],
};

export const alertsSlice = createSlice({
  name: 'alerts',
  initialState: INITIAL_STATE,
  reducers: {
    addAlert(state, action) {
      state.alerts = [...state.alerts, action.payload];
    },
  },
});

export const { addAlert } = alertsSlice.actions;

export const alertsReducer = alertsSlice.reducer;
