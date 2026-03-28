import { applyMiddleware, compose, createStore } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';
import { createLogger } from 'redux-logger';
import { rootReducer } from './root-reducer';
import storage from 'redux-persist/es/storage';
import { thunk } from 'redux-thunk';

const persistConfig = {
  key: 'root',
  storage,
  blacklist: ['user'],
};

const production = import.meta.env.PROD;

const persistedReducer = persistReducer(persistConfig, rootReducer);

const logger = createLogger();

const middlewares = [!production && logger, thunk].filter(Boolean);

const composeEnhancers =
  (!production && globalThis.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

const composedEnhancers = composeEnhancers(applyMiddleware(...middlewares));

export const store = createStore(
  persistedReducer,
  undefined,
  composedEnhancers,
);

export const persistor = persistStore(store);
