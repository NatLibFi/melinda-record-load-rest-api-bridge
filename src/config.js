import {Utils} from '@natlibfi/melinda-commons';

const {readEnvironmentVariable} = Utils;

export const MONGO_URI = readEnvironmentVariable('MONGO_URI', {defaultValue: 'mongodb://localhost:27017/db'});

export const REST_API_URL = readEnvironmentVariable('REST_API_URL');
export const REST_API_USERNAME = readEnvironmentVariable('REST_API_USERNAME');
export const REST_API_PASSWORD = readEnvironmentVariable('REST_API_PASSWORD');

export const RECORD_LOAD_API_RESULT_FILE_PATH = readEnvironmentVariable('RECORD_LOAD_API_RESULT_FILE_PATH');