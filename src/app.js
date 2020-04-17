import fs from 'fs';
import axios from 'axios';
import {Error} from '@natlibfi/melinda-commons';
import {QUEUE_ITEM_STATE} from '@natlibfi/melinda-rest-api-commons';
import {promisify} from 'util';
import {REST_API_PASSWORD, REST_API_USERNAME, REST_API_URL} from './config';
import ora from 'ora';

const setTimeoutPromise = promisify(setTimeout);

run();

async function run() {
  let correlationId; // eslint-disable-line functional/no-let
  let currentQueueItemState = ''; // eslint-disable-line functional/no-let
  let lastChangeTime = ''; // eslint-disable-line functional/no-let
  let spinner; // eslint-disable-line functional/no-let

  console.log('Melinda record load rest api bridge'); // eslint-disable-line no-console
  if (process.argv[2] === '' && process.argv[3] !== null) {
    spinner = ora('Start track status!').start();
    [, , ,correlationId] = process.argv;
    return pollResult();
  }

  spinner = ora('Start bulk loader!').start();

  const args = process.argv[2].split(',');

  /* P_manage_18 arguments (23_3)
  [
    "p_active_library",     // 0
    "p_input_file",         // 1
    "p_reject_file",        // 2
    "p_log_file",           // 3
    "p_old_new",            // 4
    "p_fix_type",           // 5
    "p_check_references",   // 6
    "p_update_f",           // 7
    "p_update_type",        // 8
    "p_update_mode",        // 9
    "p_char_conv",          // 10
    "p_merge_type",         // 11
    "p_cataloger_in",       // 12
    "p_cataloger_level_x",  // 13
    "p_z07_priority_year",  // 14
    "p_redirection_field"   // 15
  ]
  */

  try {
    // Turn params to camelCase and ditching parametters after 5th
    const params = {
      pActiveLibrary: args[0],
      pInputFile: args[1],
      pRejectFile: args[2],
      pLogFile: args[3],
      pOldNew: args[4]
    };
    spinner.start('Loaded parmas');
    // Console.log(params); // eslint-disable-line no-console

    // Check if the file is readable.
    spinner.start('Checking file');
    try {
      fs.accessSync(params.pInputFile, fs.constants.R_OK);
      // Console.log(`${file} is readable`); // eslint-disable-line no-console
    } catch (err) {
      console.log(params.pInputFile); // eslint-disable-line no-console
      console.log(err); // eslint-disable-line no-console
      throw new Error(404, 'Inputfile not found');
    }

    const stream = fs.createReadStream(params.pInputFile);

    spinner.start('Uploading file to queue');
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

    spinner.succeed('Files has been set to queue');
    console.log(response.data.value); // eslint-disable-line no-console

    correlationId = response.data.value.correlationId; // eslint-disable-line prefer-destructuring

    console.log('Waiting for status updates'); // eslint-disable-line no-console

    currentQueueItemState = response.data.value.queueItemState;
    lastChangeTime = response.data.value.modificationTime;
    spinner.start(`${currentQueueItemState} modification time: ${lastChangeTime} , Ids handled: ${response.data.value.handledIds.length}`);
    await pollResult();
  } catch (err) {
    console.log('error', err); // eslint-disable-line no-console
    return process.exit(1); // eslint-disable-line no-process-exit
  }

  async function pollResult(wait = false) {
    try {
      if (wait) {
        await setTimeoutPromise(3000);
        return pollResult();
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
        throw new Error(404, `Queue item ${correlationId} not found!`);
      }

      const [result] = response.data;

      if (result.queueItemState !== currentQueueItemState || result.modificationTime !== lastChangeTime) {
        currentQueueItemState = result.queueItemState || 'Waiting...';
        lastChangeTime = result.modificationTime;
        spinner.start(`${currentQueueItemState} modification time: ${lastChangeTime} , Ids handled: ${result.handledIds.length}`);

        return pollResult(true);
      }

      if (result.queueItemState === QUEUE_ITEM_STATE.ERROR) {
        spinner.fail('Request has failed');
        console.log(result); // eslint-disable-line no-console
        return process.exit(0); // eslint-disable-line no-process-exit
      }

      if (result.queueItemState === QUEUE_ITEM_STATE.DONE) {
        spinner.succeed('Request has been handled');
        console.log(result); // eslint-disable-line no-console
        return process.exit(0); // eslint-disable-line no-process-exit
      }

      pollResult(true);
    } catch (error) {
      console.log('error', error); // eslint-disable-line no-console
      return process.exit(1); // eslint-disable-line no-process-exit
    }
  }
}
