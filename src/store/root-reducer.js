import { combineReducers } from 'redux';
import { schedulesReducer } from './schedules/schedules.reducer';
import { alertsReducer } from './alerts/alerts.reducer';

export const rootReducer = combineReducers({
  schedules: schedulesReducer,
  alerts: alertsReducer,
});
