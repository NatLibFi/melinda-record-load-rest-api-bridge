import fs from 'fs';
import axios from 'axios';
import ProcessError from '@natlibfi/melinda-commons';
import {mongoFactory, QUEUE_ITEM_STATE} from '@natlibfi/melinda-rest-api-commons';
import {promisify} from 'util';
import {REST_API_PASSWORD, REST_API_USERNAME, REST_API_URL, MONGO_URI, RECORD_LOAD_API_RESULT_FILE_PATH} from './config';
import ora from 'ora';

const setTimeoutPromise = promisify(setTimeout);

run();

async function run() {
	const mongoOperator = await mongoFactory(MONGO_URI);
	let pollParams;
	let currentQueueItemState;
	let lastChangeTime;
	const spinner = ora('Start bulk loader!').start();

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
	args[1] = '/home/jonollil/LOCKFILE-PATH-HERE/bulk-loader-rest-test-new.seq';
	args[3] = 'test.syslog';
	args[12] = 'kvp4046';

	try {
		const params = {
			library: args[0],
			inputFile: args[1],
			rejectedFile: null,
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
			console.log(err);
			throw new ProcessError(404, 'Inputfile not found');
		}

		const stream = fs.createReadStream(params.inputFile);

		spinner.start('Uploading file to queue');
		const response = await axios({
			method: 'post',
			baseURL: REST_API_URL,
			url: (params.method === 'OLD') ? 'bulk/update' : 'bulk/create',
			headers: {'Content-Type': 'application/alephseq'},
			params,
			data: stream,
			auth: {
				username: REST_API_USERNAME,
				password: REST_API_PASSWORD
			}
		});

		spinner.succeed('Files has been set to queue');
		console.log(response.data);

		// Backup location for correlationId if this software shutsdown
		fs.writeFileSync(RECORD_LOAD_API_RESULT_FILE_PATH + args[3] + '.correlationId', response.data.correlationId);

		pollParams = {
			correlationId: response.data.correlationId,
			cataloger: response.data.cataloger,
			operation: response.data.operation
		};

		console.log('Waiting for status updates');

		currentQueueItemState = response.data.queueItemState;
		lastChangeTime = response.data.modificationTime;
		await pollResult();
	} catch (err) {
		console.log('error', err);
		process.exit(0);
	}

	async function pollResult(wait) {
		if (wait) {
			await setTimeoutPromise(200);
		}

		const result = await mongoOperator.query(pollParams);
		if (result[0].queueItemState !== currentQueueItemState || result[0].modificationTime !== lastChangeTime) {
			currentQueueItemState = result[0].queueItemState;
			lastChangeTime = result[0].modificationTime;
			spinner.start(`${currentQueueItemState} modification time: ${lastChangeTime} , Ids handled: ${result[0].handledIds.length}`);
		}

		if (result[0].queueItemState.startsWith(QUEUE_ITEM_STATE.ERROR)) {
			spinner.fail('Request has failed');
			console.log(result[0]);
			process.exit(0);
		}

		if (result[0].queueItemState === QUEUE_ITEM_STATE.DONE) {
			spinner.succeed('Request has been handled');
			console.log(result[0]);
			fs.writeFileSync(RECORD_LOAD_API_RESULT_FILE_PATH + args[3], result[0].handledIds.map(id => id + args[0]).join('\n'));
			fs.unlinkSync(RECORD_LOAD_API_RESULT_FILE_PATH + args[3] + '.correlationId');
			process.exit(0);
		} else {
			pollResult(true);
		}
	}
}
