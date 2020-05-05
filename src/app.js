import fs from 'fs';
import fetch from 'node-fetch';
import {Error as ApiError, Utils} from '@natlibfi/melinda-commons';
import {logError, QUEUE_ITEM_STATE} from '@natlibfi/melinda-rest-api-commons';
import httpStatus from 'http-status';
import {promisify} from 'util';

const setTimeoutPromise = promisify(setTimeout);

export default function ({restApiPassword, restApiUsername, restApiUrl}, handleUnexpectedAppError) {
  const {createLogger} = Utils;
  const logger = createLogger();

  return {newProcess, pollResult};

  async function newProcess(params) {
    try {
      logger.log('verbose', 'Settings loaded');
      logger.log('debug', `Settings:\n${JSON.stringify(params)}`);

      const query = new URLSearchParams(params);
      const urlEnd = params.pOldNew === 'OLD' ? 'bulk/update?' : 'bulk/create?';
      const url = new URL(urlEnd + query, restApiUrl);

      logger.log('verbose', 'Uploading file to queue');
      logger.log('debug', url.toString());
      const response = await fetch(url, {
        method: 'post',
        headers: {
          'content-type': 'application/alephseq',
          'Authorization': `Basic ${Buffer.from(`${restApiUsername}:${restApiPassword}`).toString('base64')}`,
          'Accept': 'application/json'
        },
        body: readFiletoStream(params.pInputFile)
      });

      logger.log('http', `Response status: ${response.status}`);

      if (response.status === httpStatus.OK) {
        const result = await response.json();
        logger.log('verbose', 'Files has been set to queue');
        logger.log('debug', `Response:\n${JSON.stringify(result.value)}`);
        logger.log('info', `Waiting for status updates to ${result.value.correlationId}`);
        logger.log('verbose', `${result.value.queueItemState || 'Waiting...'} modification time: ${result.value.modificationTime} , Ids handled: ${result.value.handledIds.length || 0}`);

        return pollResult(result.value.correlationId);
      }

      throw new ApiError(response.status, await response.text());
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

  async function pollResult(correlationId, modificationTime, wait = false) {
    try {
      if (wait) {
        await setTimeoutPromise(3000);
        return pollResult(correlationId, modificationTime);
      }
      const query = new URLSearchParams({id: correlationId});
      const url = new URL(`${restApiUrl}bulk/?${query}`);

      logger.log('silly', url.toString());

      const response = await fetch(url, {
        method: 'get',
        headers: {
          'Content-Type': 'application/alephseq',
          'Authorization': `Basic ${Buffer.from(`${restApiUsername}:${restApiPassword}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      });

      logger.log('silly', `Response status: ${response.status}`);

      if (response.status === httpStatus.OK) {
        const [result] = await response.json();

        if (result === undefined) { // eslint-disable-line functional/no-conditional-statement
          throw new ApiError(404, `Queue item ${correlationId} not found!`);
        }

        if (result.queueItemState === QUEUE_ITEM_STATE.ERROR) { // eslint-disable-line functional/no-conditional-statement
          throw new ApiError(500, `Process has failed ${JSON.stringify(result)}`);
        }

        if (result.queueItemState === QUEUE_ITEM_STATE.DONE) {
          logger.log('info', `Request has been handled:\n${JSON.stringify(result)}`);
          return;
        }

        if (modificationTime === result.modificationTime) {
          return pollResult(correlationId, modificationTime, true);
        }

        logger.log('verbose', `${result.queueItemState || 'Waiting...'} modification time: ${result.modificationTime} , Ids handled: ${result.handledIds.length}`);
        return pollResult(correlationId, result.modificationTime, true);
      }

      throw new ApiError(response.status, await response.text());
    } catch (error) {
      logError(error);
      return handleUnexpectedAppError('Unexpected error in pollResults');
    }
  }
}
