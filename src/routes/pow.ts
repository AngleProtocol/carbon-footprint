/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';

import { Router } from 'express';

import computePoWImpact from '../computePoWImpact';
import { INFURA_FETCH_LIMIT, MERGE_BLOCK } from '../constants';
import { joiAddressValidator, validateParams } from '../utils';
import fetchTxList from '../utils/fetchTxList';
import loadJSON from '../utils/loadJSON';

const router = Router();

router.get('', validateParams({ address: joiAddressValidator().required() }, 'query'), async function (req, res) {
  const { address } = res.locals.inputs as { address: string };

  const difficultyJSON = await loadJSON('DIFFICULTIES.json');
  const gasUsedJSON = await loadJSON('GAS_USED.json');

  let pendingTxList = await fetchTxList(address, 0, MERGE_BLOCK - 2, res);
  let txList = pendingTxList;
  while (pendingTxList.length === INFURA_FETCH_LIMIT) {
    pendingTxList = await fetchTxList(address, 0, pendingTxList[INFURA_FETCH_LIMIT - 1].blockNumber, res);
    txList = txList.concat(pendingTxList);
  }

  res.json(await computePoWImpact(difficultyJSON, gasUsedJSON, address, txList));
});

export default router;
