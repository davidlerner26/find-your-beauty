import { SCHEDULES_ACTION_TYPES } from './alerts.types';

export const INITIAL_STATE = {
  alerts: [],
};

export const alertsReducer = (state = INITIAL_STATE, action) => {
  const { type, payload } = action;

  switch (type) {
    case SCHEDULES_ACTION_TYPES.ADD_ALERT:
      return { ...state, alerts: [...state.alerts, payload] };
    default:
      return state;
  }
};
