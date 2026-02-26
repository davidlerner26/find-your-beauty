import { createSlice } from '@reduxjs/toolkit';
import { getProfessionalsAndDocuments } from '../../utils/firebase/firebase.utils';

export const fetchProfessionalsStartAsync = () => {
  return async (dispatch) => {
    dispatch(fetchProfessionalsStart());
    try {
      const professionalsArray = await getProfessionalsAndDocuments();
      dispatch(fetchProfessionalsSuccess(professionalsArray));
    } catch (error) {
      dispatch(fetchProfessionalsFailure(error));
    }
  };
};

export const PROFESSIONALS_INITIAL_STATE = {
  professionals: [],
  isLoading: false,
  error: null,
};

export const professionalsSlice = createSlice({
  name: 'professionals',
  initialState: PROFESSIONALS_INITIAL_STATE,
  reducers: {
    fetchProfessionalsStart(state) {
      state.isLoading = true;
    },
    fetchProfessionalsSuccess(state, action) {
      state.isLoading = false;
      state.professionals = action.payload;
    },
    fetchProfessionalsFailure(state, action) {
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchProfessionalsStart,
  fetchProfessionalsSuccess,
  fetchProfessionalsFailure,
} = professionalsSlice.actions;

export const professionalsReducer = professionalsSlice.reducer;
