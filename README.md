# Melinda record load rest api bridge

Software bridge for melinda record load api scripts to REST api integration

### Environment variables
| Name                             | Mandatory | Description                                                                                                        |
|----------------------------------|-----------|--------------------------------------------------------------------------------------------------------------------|
| REST_API_URL                     | Yes       | A serialized URL address of Melinda-rest-api                                                                       |
| REST_API_USERNAME                | Yes       | Username to Melinda-rest-api                                                                                       |
| REST_API_PASSWORD                | Yes       | Password of the username to Melinda-rest-api                                                                       |
| RECORD_LOAD_API_RESULT_FILE_PATH | Yes       | A serialized string of desired file path for result file. e.g. '/file/path/test.syslog'                            |
| MONGO_URI                        | No        | A serialized URL address of Melinda-rest-api's import queue database. Defaults to `'mongodb://localhost:27017/db'` |

## License and copyright

Copyright (c) 2020 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **GNU Affero General Public License Version 3** or any later version.
