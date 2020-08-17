/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Melinda-record-load-pi-bridge
*
* Copyright (C) 2018-2019 University Of Helsinki (The National Library Of Finland)
*
* This file is part of melinda-rest-api microservice
*
* melinda-rest-api microservice is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* melinda-rest-api microservice is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/
/* eslint-disable no-process-exit */

import httpStatus from 'http-status';
import {Error as ApiError} from '@natlibfi/melinda-commons';
import {createLogger, handleInterrupt} from '@natlibfi/melinda-backend-commons';
import {logError} from '@natlibfi/melinda-rest-api-commons';
import * as config from './config';
import startApp from './app';
import {handleArgsToParams} from './utils';

run();

async function run() {
  const logger = createLogger();
  const [,, rawPArgs] = process.argv;

  registerInterruptionHandlers();

  const server = await startApp(config, handleUnexpectedAppError);

  logger.log('info', 'Melinda record load rest api bridge');
  if (process.argv[2] === undefined || process.argv[2] === '--help') {
    return logger.log('info', `Help:\nTo run new process give 2nd argument as 'p_active_library,p_input_file,p_reject_file,p_log_file,p_old_new'\nParams "p_active_library" and "p_old_new" are required\nParams "p_input_file" and "p_reject_file" are optional\nFor example: "node dist/index.js FIN01,,,OLD"\nTo track runnig process give process id as 2nd argument\nFor example: "node dist/index.js 00000000-0000-0000-0000-00000000000"`);
  }

  const pArgs = rawPArgs.split(',');
  if (pArgs.length === 1) {
    logger.log('info', `Start track process status of ${pArgs[0]}!`);
    return server.pollResult(pArgs[0]);
  }

  if (pArgs.length > 1) {
    logger.log('info', 'Start new bulk loader process!');

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
    if (pArgs[0] && pArgs[1] && pArgs[4]) {
      // Turn params to camelCase and ditching parametters after 5th (exept 13th)
      // Params 2, 3 and 12 are optional
      const params = handleArgsToParams(pArgs);

      return server.newProcess(params);
    }

    throw new ApiError(httpStatus.BAD_REQUEST, 'Bad arguments');
  }

  function handleUnexpectedAppError(message) {
    handleTermination({code: 1, message});
  }

  function registerInterruptionHandlers() {
    process
      .on('SIGTERM', handleSignal)
      .on('SIGINT', handleInterrupt)
      .on('uncaughtException', ({stack}) => {
        handleTermination({code: 1, message: stack});
      })
      .on('unhandledRejection', ({stack}) => {
        handleTermination({code: 1, message: stack});
      });

    function handleSignal(signal) {
      handleTermination({code: 1, message: `Received ${signal}`});
    }
  }

  function handleTermination({code = 0, message = false}) {
    logMessage(message);
    process.exit(code);
  }

  function logMessage(message) {
    if (message) {
      return logError(message);
    }
  }
}
