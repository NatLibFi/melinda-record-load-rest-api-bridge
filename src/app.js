import fs from 'fs';
import {Error as ApiError, Utils, createApiClient} from '@natlibfi/melinda-commons';
import {logError, QUEUE_ITEM_STATE} from '@natlibfi/melinda-rest-api-commons';
import httpStatus from 'http-status';
import {promisify} from 'util';

const setTimeoutPromise = promisify(setTimeout);

export default function ({restApiPassword, restApiUsername, restApiUrl}, handleUnexpectedAppError) {
  const {createLogger} = Utils;
  const logger = createLogger();
  const client = createApiClient({restApiPassword, restApiUsername, restApiUrl});

  return {newProcess, pollResult};

  async function newProcess(params) {
    try {
      logger.log('verbose', 'Settings loaded');
      logger.log('debug', `Settings:\n${JSON.stringify(params)}`);

      logger.log('verbose', 'Uploading file to queue');
      const result = await client.postBulk({params, contentType: 'application/alephseq', body: readFiletoStream(params.pInputFile)});
      logger.log('verbose', 'Files has been set to queue');
      logger.log('debug', `Response:\n${JSON.stringify(result.value)}`);
      logger.log('info', `Waiting for status updates to ${result.value.correlationId}`);
      logger.log('verbose', `${result.value.queueItemState || 'Waiting...'} modification time: ${result.value.modificationTime} , Ids handled: ${result.value.handledIds.length || 0}`);

      return pollResult(result.value.correlationId);
    } catch (err) {
      logError(err);
      return handleUnexpectedAppError('Unexpected error in newProcess');
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

  async function pollResult(correlationId, modificationTime = null, wait = false) {
    try {
      if (wait) {
        await setTimeoutPromise(3000);
        return pollResult(correlationId, modificationTime);
      }

      const result = await client.getMetadata({id: correlationId});

      if (result === undefined) { // eslint-disable-line functional/no-conditional-statement
        throw new ApiError(404, `Queue item ${correlationId} not found!`);
      }

      if (result.queueItemState === QUEUE_ITEM_STATE.ERROR) { // eslint-disable-line functional/no-conditional-statement
        throw new ApiError(500, `Process has failed ${JSON.stringify(result)}`);
      }

      if (result.queueItemState === QUEUE_ITEM_STATE.DONE) {
        return logger.log('info', `Request has been handled:\n${JSON.stringify(result)}`);
      }

      if (modificationTime === result.modificationTime || modificationTime === null) {
        return pollResult(correlationId, modificationTime, true);
      }

      logger.log('verbose', `${result.queueItemState || 'Waiting...'} modification time: ${result.modificationTime} , Ids handled: ${result.handledIds.length}`);
      return pollResult(correlationId, result.modificationTime, true);
    } catch (error) {
      return handleUnexpectedAppError(error.payload);
    }
  }
}
