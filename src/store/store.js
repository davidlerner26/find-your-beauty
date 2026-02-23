import { applyMiddleware, compose, createStore } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import logger from 'redux-logger';
import { rootReducer } from './root-reducer';
import storage from 'redux-persist/lib/storage';
import { thunk } from 'redux-thunk';

const persistConfig = {
  key: 'root',
  storage,
  backlist: ['user'],
};

const production = import.meta.env.PROD;

const persistedReducer = persistReducer(persistConfig, rootReducer);

const middleWares = [!production && logger, thunk].filter(Boolean);

const componseEnhancer =
  (!production && window && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose;

const composedEnhancers = componseEnhancer(applyMiddleware(...middleWares));

export const store = createStore(
  persistedReducer,
  undefined,
  composedEnhancers,
);

export const persistor = persistStore(store);
