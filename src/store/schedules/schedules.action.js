import { createAction } from '../../utils/reducer/reducer.utils';
import { SCHEDULES_ACTION_TYPES } from './schedules.types';

export const addSchedule = (schedule) =>
  createAction(SCHEDULES_ACTION_TYPES.ADD_SCHEDULE, schedule);

export const removeSchedule = (schedule) =>
  createAction(SCHEDULES_ACTION_TYPES.REMOVE_SCHEDULE, schedule);
