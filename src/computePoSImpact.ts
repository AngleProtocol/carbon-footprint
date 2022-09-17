import axios from 'axios';
import fs from 'fs';

import { KCO2_PER_KWH, MERGE_BLOCK } from './constants';
import isContract from './utils/isContract';

// Source https://circularcomputing.com/news/carbon-footprint-laptop/#:~:text=Through%20our%20research%20of%20230,bed%20house%20with%20CO2%20equivalent.
const PRODUCTION_HARDWARE = (330 / KCO2_PER_KWH) * (12 / (3 * 365 * 24 * 60 * 60)); // KgCO2 repercutated during a 3 year lifecycle in kWh
// Source https://github.com/kylemcdonald/ethereum-emissions/blob/main/McDonald-Ethereum-Emissions.pdf
const CONSUMPTION_HARDWARE = 0.15; // kWh

const computePoSImpact = async (
  validatorJSON: { [blockNumber: number]: number },
  gasUsedJSON: { [blockNumber: number]: number },
  address: string,
  txList: any
): Promise<{ impact: number; gas: number; tx: number }> => {
  const hasCode = await isContract(address);
  const prevTxHash = '';
  let impact = 0;
  let gas = 0;
  for (const tx of txList) {
    // Floor to the previous XX300 block to use our cache
    let blockNumber = Math.round((tx.blockNumber - 300) / 1000) * 1000 + 300; // To avoid parsing every block round to the hour -> leads to approx
    blockNumber = Math.max(MERGE_BLOCK, blockNumber);
    // Deduping and checking sender
    if (prevTxHash !== tx.hash && (hasCode || tx.from.toLowerCase() === address.toLowerCase())) {
      // Scrap Etherscan in case we don't have the data locally - API can't be used with a free endpoint
      {
        if (!validatorJSON[blockNumber] || !gasUsedJSON[blockNumber]) {
          try {
            const response = await axios.get(`https://etherscan.io/block/${blockNumber}`);
            const epoch = parseInt(response.data.split("<a href='https://beaconscan.com/epoch/")[1].split("'")[0]);
            const gasUsed = parseInt(
              response.data.split('Gas Used:</div>')[1].split('<div class="col-md-9">')[1].split('</div>')[0].replaceAll(',', '')
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
          }
        }

        // Emissions linked to a block are estimated by computing the CO2 emitted by X computers running during 12 seconds
        // X being the number of runnings validators
        // We take into account instant consumption and a hardware deprecation factor
        const blockEmissions = validatorJSON[blockNumber] * ((CONSUMPTION_HARDWARE * 12) / 3600 + PRODUCTION_HARDWARE) * KCO2_PER_KWH; // In KCO_2

        if (blockEmissions) {
          impact += (parseInt(tx.gas) / gasUsedJSON[blockNumber]) * blockEmissions;
        }
        gas += parseInt(tx.gas);

        // console.log(`Tx emissions: ${impact} KgCO2`);
        // console.log(`Emissions for block ${blockNumber}: ${blockEmissions}`);
        // console.log(`Projected daily emissions for block ${blockNumber}: ${(blockEmissions * 3600 * 24) / 13.5 / 10 ** 6} kT/day`);
        // console.log(`Projected Yearly emissions for block ${blockNumber}: ${(blockEmissions * 365 * 3600 * 24) / 13.5 / 10 ** 9} MT/year`);
      }
    }
  }
  return { impact, gas, tx: txList.length };
};

export default computePoSImpact;
