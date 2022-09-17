/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';

import axios from 'axios';
import { Router } from 'express';
import fs from 'fs';

import { validateParams } from '../utils';
import loadJSON from '../utils/loadJSON';

const router = Router();

router.get('', validateParams({}, 'query'), async function (req, res) {
  const validatorJSON = await loadJSON('VALIDATORS.json');
  const gasUsedJSON = await loadJSON('GAS_USED.json');

  let blockNumber = 15537300;
  while (blockNumber > 0) {
    blockNumber = blockNumber + 1000;
    console.log(blockNumber);

    // Scrap Etherscan in case we don't have the data locally - API can't be used with a free endpoint
    {
      if (!validatorJSON[blockNumber] || !gasUsedJSON[blockNumber]) {
        try {
          const response = await axios.get(`https://etherscan.io/block/${blockNumber}`);
          const epoch = parseInt(response.data.split("<a href='https://beaconscan.com/epoch/")[1].split("'")[0]);
          const gasUsed = parseInt(
            response.data
              .split('Gas Used:</div>')[1]
              .split('<div class="col-md-9 d-flex align-items-center">')[1]
              .split('</div>')[0]
              .replaceAll(',', '')
          );
          gasUsedJSON[blockNumber] = gasUsed;
          fs.writeFile('GAS_USED.json', JSON.stringify(gasUsedJSON), (err) => {
            if (err) {
              console.error(err);
            }
          });

          const beaconResponse = await axios.get(`https://beaconscan.com/epoch/${epoch}`);
          const validators = parseInt(
            beaconResponse.data.split('Total Validator Count')[1].split('<div class="col-md-9 font-size-1">')[1].split('</div>')[0]
          );
          validatorJSON[blockNumber] = validators;
          fs.writeFile('VALIDATORS.json', JSON.stringify(validatorJSON), (err) => {
            if (err) {
              console.error(err);
            }
          });
        } catch (e) {
          console.log(`Scrapping failed for block ${blockNumber}`);
          break;
        }
        // Delay to avoid being flagged
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  res.json({});
});

export default router;
