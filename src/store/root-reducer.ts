import { combineReducers } from 'redux';
import { schedulesReducer } from './schedules/schedules.reducer';
import { alertsReducer } from './alerts/alerts.reducer';
import { professionalsReducer } from './professionals/professionals.reducer';

export const rootReducer = combineReducers({
  schedules: schedulesReducer,
  alerts: alertsReducer,
  professionals: professionalsReducer,
});
