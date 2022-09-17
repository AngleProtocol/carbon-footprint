/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';

import { Router } from 'express';

import computePoSImpact from '../computePoSImpact';
import { INFURA_FETCH_LIMIT, MERGE_BLOCK } from '../constants';
import { joiAddressValidator, validateParams } from '../utils';
import fetchTxList from '../utils/fetchTxList';
import loadJSON from '../utils/loadJSON';

const router = Router();

router.get('', validateParams({ address: joiAddressValidator().required() }, 'query'), async function (req, res) {
  const { address } = res.locals.inputs as { address: string };

  const validatorJSON = await loadJSON('VALIDATORS.json');
  const gasUsedJSON = await loadJSON('GAS_USED.json');

  let pendingTxList = await fetchTxList(address, MERGE_BLOCK, 999999999999999, res); // The Merge Block Number - 1
  let txList = pendingTxList;
  while (pendingTxList.length === INFURA_FETCH_LIMIT) {
    pendingTxList = await fetchTxList(address, 0, pendingTxList[INFURA_FETCH_LIMIT - 1].blockNumber, res); // The Merge Block Number - 1
    txList = txList.concat(pendingTxList);
  }

  res.json(await computePoSImpact(validatorJSON, gasUsedJSON, address, txList));
});

export default router;
