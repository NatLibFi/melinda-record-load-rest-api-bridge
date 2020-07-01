import {Utils} from '@natlibfi/melinda-commons';

const {readEnvironmentVariable} = Utils;

export const restApiUrl = readEnvironmentVariable('REST_API_URL');
export const restApiUsername = readEnvironmentVariable('REST_API_USERNAME');
export const restApiPassword = readEnvironmentVariable('REST_API_PASSWORD');
export const defaultTempFilePath = readEnvironmentVariable('RECORD_LOAD_API_TEMP_FILE_PATH');
