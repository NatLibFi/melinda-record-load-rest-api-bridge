# Melinda record load rest api bridge

Software bridge for melinda record load api scripts to REST api integration

## Usage
Replace normal p_manage_18 load_command with "node /exlibris/.../app/dist/index.js `<p_manage_18 arguments separated with comma (","), e.g. XXX01,/file/test.seq,...>`"
Arguments 0-4 and 12 are passed forward, rest are discarded.

Help: node ../app/dist/index.js or node ../app/dist/index.js --help
Get your queue items: curl -X GET "<REST_API_URL>/bulk/" -u '<REST_API_USERNAME>:<REST_API_PASSWORD>'

Track / check status of ongoing process: node ../app/dist/index.js <Queue item id>
Example: node  ../app/dist/index.js 0000000-0000-0000-0000-000000000

Run bridge: node ../app/dist/index.js <p_active_library>\*,<p_input_file>\*,<p_reject_file>, <p_log_file>, <p_old_new>\*,,,,,,,,<p_cataloger_in>
* Input material (p_input_file): /exlXXXXX/lXXXXX/melinda-record-load-rest-api-bridge/test/update_test.seq
* Error log file (p_reject_file): record-load-api/test.rej
* Results log file (p_log_file): record-load-api/test.syslog
* Operation (p_old_new): For new records 'NEW', and for update 'OLD'

Example: node ../app/dist/index.js XXXXX,/exlXXXXX/lXXXXX/melinda-record-load-rest-api-bridge/test/update_test.seq,record-load-api/test.rej,record-load-api/test.log,OLD,,,,,,,,KVP-TEST

### Enviromental variables
| Name                           | Mandatory | Description                                  |
|--------------------------------|-----------|----------------------------------------------|
| REST_API_URL                   | Yes       | URL address of Melinda-rest-api              |
| REST_API_USERNAME              | Yes       | Username to Melinda-rest-api                 |
| REST_API_PASSWORD              | Yes       | Password of the username to Melinda-rest-api |
| RECORD_LOAD_API_TEMP_FILE_PATH | Yes       | Base folderlocation of logs*                 |
| LOG_LEVEL                      | No        | Defaults to info**                           |
* Full log location is generated as: RECORD_LOAD_API_TEMP_FILE_PATH + p_active_library + /scratch/ + p_log_file or p_reject_file.
  E.g. /exlxxxxx/axxxx/uxx_x/xxx01/scratch/record-load-api/test_load.log
** More about LOG_LEVEL [here](https://www.npmjs.com/package/winston#logging-levels)

### Arguments
| P_manage_18 arguments (23_3) | Mandatory   | Defaults   | Args |
|------------------------------|-------------|------------|------|
| "p_active_library"           | YES         |            | 0    |
| "p_input_file"               | YES         |            | 1    |
| "p_reject_file"              | RECOMMENDED |            | 2    |
| "p_log_file"                 | RECOMMENDED |            | 3    |
| "p_old_new"                  | YES         |            | 4    |
| "p_fix_type"                 |             | INSB       | 5    |
| "p_check_references"         |             |            | 6    |
| "p_update_f"                 |             | FULL       | 7    |
| "p_update_type"              |             | REP        | 8    |
| "p_update_mode"              |             | M          | 9    |
| "p_char_conv"                |             |            | 10   |
| "p_merge_type"               |             |            | 11   |
| "p_cataloger_in"             |             | `Env file` | 12   |
| "p_cataloger_level_x"        |             |            | 13   |
| "p_z07_priority_year"        |             | 2099       | 14   |
| "p_redirection_field"        |             |            | 15   |
Only arguments 0-4 and 12 are passed forward, rest are discarded. More in rest-api-commons README

## License and copyright

Copyright (c) 2020 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **GNU Affero General Public License Version 3** or any later version.
