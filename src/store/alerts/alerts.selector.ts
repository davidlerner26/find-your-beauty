import { createSelector } from 'reselect';

const selectAlertReducer = (state) => state.alerts;

export const selectAlerts = createSelector(
  [selectAlertReducer],
  (alertsSlice) => alertsSlice.alerts,
);
