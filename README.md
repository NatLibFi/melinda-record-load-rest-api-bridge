# Melinda record load rest api bridge

Software bridge for melinda record load api scripts to REST api integration

## Usage
Replace normal p_manage_18 load_command with "node /exlibris/linnea/melinda-record-load-rest-api-bridge/dist/app.js `<p_manage_18 arguments separated with comma (","), e.g. XXX01,/file/test.seq,...>`"

### Enviromental variables
| Name              | Mandatory | Description                                  |
|-------------------|-----------|----------------------------------------------|
| REST_API_URL      | Yes       | A serialized URL address of Melinda-rest-api |
| REST_API_USERNAME | Yes       | Username to Melinda-rest-api                 |
| REST_API_PASSWORD | Yes       | Password of the username to Melinda-rest-api |

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
Only arguments 0-4 are passed forward, rest are discarded. More in rest-api-commons README

## License and copyright

Copyright (c) 2020 **University Of Helsinki (The National Library Of Finland)**

This project's source code is licensed under the terms of **GNU Affero General Public License Version 3** or any later version.
