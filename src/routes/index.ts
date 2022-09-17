/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';

import { Router } from 'express';

import computePoSImpact from '../computePoSImpact';
import computePoWImpact from '../computePoWImpact';
import { INFURA_FETCH_LIMIT, MERGE_BLOCK } from '../constants';
import { joiAddressValidator, validateParams } from '../utils';
import fetchTxList from '../utils/fetchTxList';
import loadJSON from '../utils/loadJSON';

const router = Router();

router.get('', validateParams({ address: joiAddressValidator().required() }, 'query'), async function (req, res) {
  const { address } = res.locals.inputs as { address: string };

  const validatorJSON = await loadJSON('VALIDATORS.json');
  const difficultyJSON = await loadJSON('DIFFICULTIES.json');
  const gasUsedJSON = await loadJSON('GAS_USED.json');

  let pendingTxList = await fetchTxList(address, MERGE_BLOCK, 999999999999999, res); // The Merge Block Number - 1
  let posTxList = pendingTxList;
  while (pendingTxList.length === INFURA_FETCH_LIMIT) {
    pendingTxList = await fetchTxList(address, 0, pendingTxList[INFURA_FETCH_LIMIT - 1].blockNumber, res); // The Merge Block Number - 1
    posTxList = posTxList.concat(pendingTxList);
  }

  pendingTxList = await fetchTxList(address, 0, MERGE_BLOCK - 2, res);
  let powTxList = pendingTxList;
  while (pendingTxList.length === INFURA_FETCH_LIMIT) {
    pendingTxList = await fetchTxList(address, 0, pendingTxList[INFURA_FETCH_LIMIT - 1].blockNumber, res);
    powTxList = powTxList.concat(pendingTxList);
  }

  const posPromise = computePoSImpact(validatorJSON, gasUsedJSON, address, posTxList);
  const powPromise = computePoWImpact(difficultyJSON, gasUsedJSON, address, powTxList);
  const [posData, powData] = await Promise.all([posPromise, powPromise]);

  res.json({ posData, powData });
});

export default router;
