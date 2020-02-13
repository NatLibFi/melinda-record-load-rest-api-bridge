import {Utils} from '@natlibfi/melinda-commons';

const {readEnvironmentVariable} = Utils;

export const REST_API_URL = readEnvironmentVariable('REST_API_URL');
export const REST_API_USERNAME = readEnvironmentVariable('REST_API_USERNAME');
export const REST_API_PASSWORD = readEnvironmentVariable('REST_API_PASSWORD');
