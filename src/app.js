import fs from 'fs';
import axios from 'axios';
import ProcessError from '@natlibfi/melinda-commons';
import {QUEUE_ITEM_STATE} from '@natlibfi/melinda-rest-api-commons';
import {promisify} from 'util';
import {REST_API_PASSWORD, REST_API_USERNAME, REST_API_URL} from './config';
import ora from 'ora';

const setTimeoutPromise = promisify(setTimeout);

run();

async function run() {
	let correlationId;
	let currentQueueItemState = '';
	let lastChangeTime = '';
	let spinner;
	if (process.argv[2] === '' && process.argv[3] !== null) {
		spinner = ora('Start track status!').start();
		correlationId = process.argv[3]
		pollResult();
	} else {
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

		// For the test
		// args[1] = '/file/location/here/test.seq';
		// args[3] = 'test.syslog';
		// args[12] = 'test000';

		try {
			const params = {
				library: args[0],
				inputFile: args[1],
				rejectedFile: args[2],
				resultFile: args[3],
				method: args[4],
				fixRoutine: args[5],
				indexing: args[7],
				updateAction: args[8],
				mode: args[9],
				charConversion: args[10],
				mergeRoutine: args[11],
				cataloger: args[12], // Replace with REST_API_USERNAME? To avoid miss usage
				catalogerLevel: args[13],
				indexingPriority: args[14]
			};
			spinner.start('Loaded parmas');
			// Console.log(params);

			// Check if the file is readable.
			spinner.start('Checking file');
			try {
				fs.accessSync(params.inputFile, fs.constants.R_OK);
				// Console.log(`${file} is readable`);
			} catch (err) {
				console.log(params.inputFile)
				console.log(err);
				throw new ProcessError(404, 'Inputfile not found');
			}

			const stream = fs.createReadStream(params.inputFile);

			spinner.start('Uploading file to queue');
			const response = await axios({
				method: 'post',
				baseURL: REST_API_URL,
				url: (params.method === 'OLD') ? 'bulk/update' : 'bulk/create',
				headers: {"content-type": 'application/alephseq'},
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
			console.log(response.data);

			correlationId = response.data.correlationId,

			console.log('Waiting for status updates');

			currentQueueItemState = response.data.queueItemState;
			lastChangeTime = response.data.modificationTime;
			spinner.start(`${currentQueueItemState} modification time: ${lastChangeTime} , Ids handled: ${result.handledIds.length}`);
			await pollResult();
		} catch (err) {
			console.log('error', err);
			process.exit(5);
		}
	}

	async function pollResult(wait = false) {
		try {
			if (wait) {
				await setTimeoutPromise(1000);
			}

			const response = await axios({
				method: 'get',
				baseURL: REST_API_URL,
				url: `bulk/?id=${correlationId}`,
				headers: {"content-type": 'application/alephseq'},
				responseType: 'json',
				auth: {
					username: REST_API_USERNAME,
					password: REST_API_PASSWORD
				}
			});

			if (response.data === []) {
				throw new ProcessError(404, `Queue item ${correlationId} not found!`);
			}

			const result = response.data[0];

			if (result.queueItemState !== currentQueueItemState || result.modificationTime !== lastChangeTime) {
				currentQueueItemState = result.queueItemState;
				lastChangeTime = result.modificationTime;
				spinner.start(`${currentQueueItemState} modification time: ${lastChangeTime} , Ids handled: ${result.handledIds.length}`);
			}

			if (result.queueItemState.startsWith(QUEUE_ITEM_STATE.ERROR)) {
				spinner.fail('Request has failed');
				console.log(result);
				process.exit(0);
			}

			if (result.queueItemState === QUEUE_ITEM_STATE.DONE) {
				spinner.succeed('Request has been handled');
				console.log(result);
				process.exit(0);
			} else {
				pollResult(true);
			}
		} catch (error) {
			console.log('error', error);
			process.exit(5);
		}
	}
}
