import {defaultTempFilePath} from './config';

export function handleArgsToParams(pArgs) {
  const params = {
    pActiveLibrary: pArgs[0],
    pInputFile: pArgs[1],
    pRejectFile: handleFileParam(pArgs[0], pArgs[2], defaultTempFilePath),
    pLogFile: handleFileParam('alephe', pArgs[3], defaultTempFilePath),
    pOldNew: pArgs[4]
  };

  return handlePCatalogerIn(params, pArgs[12]);

  function handleFileParam(pActiveLibrary, inputParam, path) {
    if (inputParam === undefined || inputParam === '') {
      return null;
    }

    if (inputParam.indexOf(`${path}${pActiveLibrary.toLowerCase()}/scratch`) === -1) {
      return `${path}${pActiveLibrary.toLowerCase()}/scratch/${inputParam}`;
    }

    return inputParam;
  }

  function handlePCatalogerIn(params, pArgs12) {
    if (pArgs12 !== undefined && pArgs12 !== '') {
      return {...params, pCatalogerIn: pArgs12};
    }
    return params;
  }
}
