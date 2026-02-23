import { getProfessionalsAndDocuments } from '../../utils/firebase/firebase.utils';
import { createAction } from '../../utils/reducer/reducer.utils';
import { PROFESSIONALS_ACTION_TYPES } from './professionals.types';

export const fetchProfessionalsStart = () =>
  createAction(PROFESSIONALS_ACTION_TYPES.FETCH_PROFESSIONALS_START);

export const fetchProfessionalsSuccess = (professionalsArray) =>
  createAction(
    PROFESSIONALS_ACTION_TYPES.FETCH_PROFESSIONALS_SUCCESS,
    professionalsArray,
  );

export const fetchProfessionalsFailure = (error) =>
  createAction(PROFESSIONALS_ACTION_TYPES.FETCH_PROFESSIONALS_FAILURE, error);

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
