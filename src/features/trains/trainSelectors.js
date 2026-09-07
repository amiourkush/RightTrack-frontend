import { createSelector } from '@reduxjs/toolkit';

export const selectSearch = (state) => state.trains.search;
export const selectSearchLoading = (state) => state.trains.searchLoading;
export const selectSearchError = (state) => state.trains.searchError;
export const selectSelectedTrainNumber = (state) => state.trains.selectedTrainNumber;
export const selectTrainByNumber = (number) => (state) => state.trains.byNumber[String(number)] || null;
export const selectSelectedTrain = createSelector(
  [(state) => state.trains.byNumber, selectSelectedTrainNumber],
  (byNumber, number) => number ? byNumber[number] : null,
);
