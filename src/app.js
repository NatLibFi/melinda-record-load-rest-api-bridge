import fs from 'fs';
import axios from 'axios';
import {Error as ApiError, Utils} from '@natlibfi/melinda-commons';
import {logError, QUEUE_ITEM_STATE} from '@natlibfi/melinda-rest-api-commons';
import {promisify} from 'util';
import {REST_API_PASSWORD, REST_API_USERNAME, REST_API_URL} from './config';

const setTimeoutPromise = promisify(setTimeout);

export default function () {
  const {createLogger} = Utils;
  const logger = createLogger(); // eslint-disable-line no-unused-vars

  return {newProcess, pollResult};

  async function newProcess(params) {
    try {
      logger.log('verbose', 'Settings loaded');
      logger.log('debug', `Settings:\n${JSON.stringify(params)}`);

      const stream = readFiletoStream(params.pInputFile);

      logger.log('verbose', 'Uploading file to queue');
      const response = await axios({
        method: 'post',
        baseURL: REST_API_URL,
        url: params.pOldNew === 'OLD' ? 'bulk/update' : 'bulk/create',
        headers: {'content-type': 'application/alephseq'},
        params,
        data: stream,
        responseType: 'json',
        auth: {
          username: REST_API_USERNAME,
          password: REST_API_PASSWORD
        },
        maxContentLength: 13000000
      });

      logger.log('http', `Response status: ${response.status}`);

      logger.log('verbose', 'Files has been set to queue');
      logger.log('debug', `Response:\n${JSON.stringify(response.data.value)}`);

      const result = response.data.value;
      logger.log('info', `Waiting for status updates to ${result.correlationId}`);

      logger.log('verbose', `${result.queueItemState || 'Waiting...'} modification time: ${result.modificationTime} , Ids handled: ${result.handledIds.length}`);
      return pollResult(result.correlationId);
    } catch (err) {
      logError(err);
      return process.exit(1); // eslint-disable-line no-process-exit
    }

    function readFiletoStream(pInputFile) {
      // Check if the file is readable.
      logger.log('verbose', 'Checking file');
      try {
        fs.accessSync(pInputFile, fs.constants.R_OK);
        logger.log('debug', `${pInputFile} is readable`);
      } catch (err) {
        throw new ApiError(404, `Inputfile not found or not accessable at ${pInputFile}`);
      }

      return fs.createReadStream(params.pInputFile);
    }
  }

  async function pollResult(correlationId, modificationTime, wait = false) {
    try {
      if (wait) {
        await setTimeoutPromise(3000);
        return pollResult(correlationId, modificationTime);
      }

      const response = await axios({
        method: 'get',
        baseURL: REST_API_URL,
        url: `bulk/?id=${correlationId}`,
        headers: {'content-type': 'application/alephseq'},
        responseType: 'json',
        auth: {
          username: REST_API_USERNAME,
          password: REST_API_PASSWORD
        }
      });

      if (response.data === []) { // eslint-disable-line functional/no-conditional-statement
        throw new ApiError(404, `Queue item ${correlationId} not found!`);
      }

      const [result] = response.data;

      if (result.queueItemState === QUEUE_ITEM_STATE.ERROR) { // eslint-disable-line functional/no-conditional-statement
        throw new ApiError(500, `Process has failed ${JSON.stringify(result)}`);
      }

      if (result.queueItemState === QUEUE_ITEM_STATE.DONE) {
        logger.log('info', `Request has been handled:\n${JSON.stringify(result)}`);
        return process.exit(0); // eslint-disable-line no-process-exit
      }

      if (modificationTime === result.modificationTime) {
        return pollResult(correlationId, modificationTime, true);
      }

      logger.log('verbose', `${result.queueItemState || 'Waiting...'} modification time: ${result.modificationTime} , Ids handled: ${result.handledIds.length}`);
      return pollResult(correlationId, result.modificationTime, true);
    } catch (error) {
      logError(error);
      return process.exit(1); // eslint-disable-line no-process-exit
    }
  }
}
