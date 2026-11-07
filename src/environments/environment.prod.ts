import {firebaseWebApiKey} from './firebase-client';

export const environment = {
  production: true,
  API_URL: '/api',
  HISTORY_URL: '/api/history',
  HISTORY_MOCK: false,
  ADMIN_API_URL: '/api/admin',
  FIREBASE_API_KEY: firebaseWebApiKey,
  GAME_URL: 'https://logixy.net/monAJAX/cache/cache.json?nocache='
};
