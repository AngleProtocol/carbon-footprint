/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';

import axios from 'axios';
import { Router } from 'express';
import fs from 'fs';

import { validateParams } from '../utils';
import loadJSON from '../utils/loadJSON';

const router = Router();

router.get('', validateParams({}, 'query'), async function (req, res) {
  const difficultyJSON = await loadJSON('DIFFICULTIES.json');
  const gasUsedJSON = await loadJSON('GAS_USED.json');

  let blockNumber = 15537300;
  while (blockNumber > 0) {
    blockNumber = blockNumber - 1000;
    console.log(blockNumber);

    // Scrap Etherscan in case we don't have the data locally - API can't be used with a free endpoint
    {
      if (!difficultyJSON[blockNumber] || !gasUsedJSON[blockNumber]) {
        try {
          const response = await axios.get(`https://etherscan.io/block/${blockNumber}`);
          const difficulty = parseInt(
            response.data.split('Difficulty:</div>')[1].split('<div class="col-md-9">')[1].split('</div>')[0].replaceAll(',', '')
          );
          const gasUsed = parseInt(
            response.data.split('Gas Used:</div>')[1].split('<div class="col-md-9">')[1].split('</div>')[0].replaceAll(',', '')
          );
          difficultyJSON[blockNumber] = difficulty;
          fs.writeFile('DIFFICULTIES.json', JSON.stringify(difficultyJSON), (err) => {
            if (err) {
              console.error(err);
            }
          });
          gasUsedJSON[blockNumber] = gasUsed;
          fs.writeFile('GAS_USED.json', JSON.stringify(gasUsedJSON), (err) => {
            if (err) {
              console.error(err);
            }
          });
        } catch (e) {
          console.log(`Scrapping failed for block ${blockNumber}`);
        }
        // Delay to avoid being flagged
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  res.json({});
});

export default router;
