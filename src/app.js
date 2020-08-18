import fs from 'fs';
import {Error as ApiError} from '@natlibfi/melinda-commons';
import {createLogger} from '@natlibfi/melinda-backend-commons';
import {createApiClient} from '@natlibfi/melinda-rest-api-client';
import {logError, QUEUE_ITEM_STATE} from '@natlibfi/melinda-rest-api-commons';
import httpStatus from 'http-status';
import {promisify} from 'util';

const setTimeoutPromise = promisify(setTimeout);

export default function ({restApiPassword, restApiUsername, restApiUrl}, handleUnexpectedAppError) {
  const logger = createLogger();
  const client = createApiClient({restApiPassword, restApiUsername, restApiUrl});

  return {newProcess, pollResult};

  async function newProcess(params) {
    try {
      logger.log('verbose', 'Settings loaded');
      logger.log('debug', `Settings:\n${JSON.stringify(params)}`);

      logger.log('verbose', 'Uploading file to queue');
      const data = await client.createBulk(readFiletoStream(params.pInputFile), 'application/alephseq', params);
      logger.log('verbose', 'Files has been set to queue');
      logger.log('silly', `Response:\n${JSON.stringify(data)}`);
      logger.log('info', `Waiting for status updates to ${data.correlationId}`);
      logger.log('verbose', `${data.queueItemState || 'Waiting...'} modification time: ${data.modificationTime} , Ids handled: ${data.handledIds.length || 0}`);

      return pollResult(data.correlationId);
    } catch (err) {
      logError(err);
      return handleUnexpectedAppError('Unexpected error in newProcess');
    }

    function readFiletoStream(pInputFile) {
      // Check if the file is readable.
      logger.log('verbose', 'Checking file');
      logger.log('debug', `Path: ${pInputFile}`);
      try {
        fs.accessSync(pInputFile, fs.constants.R_OK);
        logger.log('debug', `${pInputFile} is readable`);
      } catch (err) {
        throw new ApiError(httpStatus.NOT_FOUND, `Inputfile not found or not accessable at ${pInputFile}`);
      }

      return fs.createReadStream(params.pInputFile);
    }
  }

  async function pollResult(correlationId, modificationTime = null, wait = false) {
    try {
      if (wait) {
        await setTimeoutPromise(3000);
        return pollResult(correlationId, modificationTime);
      }

      const data = await client.readBulk({id: correlationId});
      logger.log('silly', `Data: ${JSON.stringify(data)}`);

      if (data.length === 0) { // eslint-disable-line functional/no-conditional-statement
        throw new ApiError(httpStatus.NOT_FOUND, `Queue item ${correlationId} not found!`);
      }

      const [itemData] = data;

      if (itemData.queueItemState === QUEUE_ITEM_STATE.ERROR) { // eslint-disable-line functional/no-conditional-statement
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Process has failed ${JSON.stringify(itemData)}`);
      }

      if (itemData.queueItemState === QUEUE_ITEM_STATE.DONE) {
        return logger.log('info', `Request has been handled:\n${JSON.stringify(itemData)}`);
      }

      if (modificationTime === itemData.modificationTime || modificationTime === null) {
        return pollResult(correlationId, itemData.modificationTime, true);
      }

      logger.log('info', `${itemData.queueItemState || 'Waiting...'} modification time: ${itemData.modificationTime} , Ids handled: ${itemData.handledIds.length}`);
      return pollResult(correlationId, itemData.modificationTime, true);
    } catch (error) {
      return handleUnexpectedAppError(error.payload);
    }
  }
}
