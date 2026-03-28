import { createSelector } from 'reselect';

const selectScheduleReducer = (state) => state.schedules;

export const selectSchedules = createSelector(
  [selectScheduleReducer],
  (schedulesSlice) => schedulesSlice.schedules,
);
