import { createAction } from '../../utils/reducer/reducer.utils';
import { SCHEDULES_ACTION_TYPES } from './alerts.types';

export const addAlert = (alert) =>
  createAction(SCHEDULES_ACTION_TYPES.ADD_ALERT, alert);
