import { createSlice } from '@reduxjs/toolkit';
import { SCHEDULES_ACTION_TYPES } from './schedules.types';

export const SCHEDULES_INITIAL_STATE = {
  schedules: [{ name: 'Isadora' }, { name: 'David' }],
};

export const schedulesSlice = createSlice({
  name: 'schedules',
  initialState: SCHEDULES_INITIAL_STATE,
  reducers: {
    addSchedule(state, action) {
      state.schedules = [...state.schedules, { name: action.payload }];
    },
    removeSchedule(state, action) {
      state.schedules = state.schedules.filter(
        (i) => i.name !== action.payload.name,
      );
    },
  },
});

export const { addSchedule, removeSchedule } = schedulesSlice.actions;

export const schedulesReducer = schedulesSlice.reducer;
