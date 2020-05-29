export function handleArgsToParams(pArgs) {
  const params = {
    pActiveLibrary: pArgs[0],
    pInputFile: pArgs[1],
    pOldNew: pArgs[4]
  };

  const params2 = handlePRejectFile(params, pArgs[2]);
  const params3 = handlePLogFile(params2, pArgs[3]);
  return handlePCatalogerIn(params3, pArgs[12]);
}

function handlePRejectFile(params, pArgs2) {
  if (pArgs2 !== undefined && pArgs2 !== '') {
    return {...params, pRejectFile: pArgs2};
  }
  return params;
}

function handlePLogFile(params, pArgs3) {
  if (pArgs3 !== undefined && pArgs3 !== '') {
    return {...params, pLogFile: pArgs3};
  }
  return params;
}

function handlePCatalogerIn(params, pArgs12) {
  if (pArgs12 !== undefined && pArgs12 !== '') {
    return {...params, pCatalogerIn: pArgs12};
  }
  return params;
}
