import { SCHEDULES_ACTION_TYPES } from './schedules.types';

export const INITIAL_STATE = {
  schedules: [{ name: 'Isadora' }, { name: 'David' }],
};

export const schedulesReducer = (state = INITIAL_STATE, action) => {
  const { type, payload } = action;

  switch (type) {
    case SCHEDULES_ACTION_TYPES.ADD_SCHEDULE:
      return { ...state, schedules: [...state.schedules, { name: payload }] };
    case SCHEDULES_ACTION_TYPES.REMOVE_SCHEDULE:
      return {
        ...state,
        schedules: state.schedules.filter((i) => i.name !== payload.name),
      };
    default:
      return state;
  }
};
