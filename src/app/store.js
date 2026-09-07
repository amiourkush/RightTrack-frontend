import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import trainsReducer from '../features/trains/trainSlice';
import userReducer from '../features/user/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trains: trainsReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});
