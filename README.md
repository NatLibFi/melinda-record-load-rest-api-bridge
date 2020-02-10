# Melinda record load rest api bridge

Software bridge for melinda record load api scripts to REST api integration

## Usage
Replace normal p_manage_18 load_command with "node /exlibris/linnea/melinda-record-load-rest-api-bridge/dist/app.js `<p_manage_18 arguments separated with comma (","), e.g. XXX01,/file/test.seq....>`"

### Config variables
| Name                             | Mandatory | Description                                                                             |
|----------------------------------|-----------|-----------------------------------------------------------------------------------------|
| REST_API_URL                     | Yes       | A serialized URL address of Melinda-rest-api                                            |
| REST_API_USERNAME                | Yes       | Username to Melinda-rest-api                                                            |
| REST_API_PASSWORD                | Yes       | Password of the username to Melinda-rest-api                                            |
| RECORD_LOAD_API_RESULT_FILE_PATH | Yes       | A serialized string of desired file path for result file. e.g. '/file/path/test.syslog' |
| MONGO_URI                        | Yes       | A serialized URL address of Melinda-rest-api's import queue database.                   |

## License and copyright

Copyright (c) 2020 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **GNU Affero General Public License Version 3** or any later version.
