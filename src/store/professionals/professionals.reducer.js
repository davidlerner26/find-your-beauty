import { PROFESSIONALS_ACTION_TYPES } from './professionals.types';

export const CATEGORIES_INITIAL_STATE = {
  professionals: [],
  isLoading: false,
  error: null,
};

export const professionalsReducer = (
  state = CATEGORIES_INITIAL_STATE,
  action = {},
) => {
  const { type, payload } = action;

  switch (type) {
    case PROFESSIONALS_ACTION_TYPES.FETCH_PROFESSIONALS_START:
      return {
        ...state,
        isLoading: true,
      };
    case PROFESSIONALS_ACTION_TYPES.FETCH_PROFESSIONALS_SUCCESS:
      return { ...state, isLoading: false, professionals: payload };
    case PROFESSIONALS_ACTION_TYPES.FETCH_PROFESSIONALS_FAILURE:
      return { ...state, isLoading: false, error: payload };
    default:
      return state;
  }
};
