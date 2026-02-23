import { createSelector } from 'reselect';

const selectProfessionalsReducer = (state) => state.professionals;

export const selectProfessionals = createSelector(
  [selectProfessionalsReducer],
  (professionalsSlice) => professionalsSlice.professionals,
);

export const selectIsLoading = createSelector(
  [selectProfessionalsReducer],
  (categoriesSlice) => categoriesSlice.isLoading,
);
