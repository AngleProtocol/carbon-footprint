import axios from 'axios';
import fs from 'fs';

import { KCO2_PER_KWH } from './constants';
import isContract from './utils/isContract';

// Source https://github.com/kylemcdonald/ethereum-emissions/blob/main/McDonald-Ethereum-Emissions.pdf
const HASH_EFFICIENCY = 0.25 * 3600 * 1000 * 10 ** 6; // H / kWh
// Source https://github.com/kylemcdonald/ethereum-emissions/blob/main/McDonald-Ethereum-Emissions.pdf
const OVER_HARDWARE = 1.03; // Overhead for CPU and computer ressources
// Source https://github.com/kylemcdonald/ethereum-emissions/blob/main/McDonald-Ethereum-Emissions.pdf
const OVER_DATACENTER = 1.1; // Overhead for datacenter (cooling, lighting...)
// Source https://github.com/kylemcdonald/ethereum-emissions/blob/main/McDonald-Ethereum-Emissions.pdf
const LOSS_GRID = 1.06; // Electricity loss during transportation through the grid
// Source https://github.com/kylemcdonald/ethereum-emissions/blob/main/McDonald-Ethereum-Emissions.pdf
const EFFICIENCY_PSU = 0.9; // Power supply efficiency for electricity converter

const computePoWImpact = async (
  difficultyJSON: { [blockNumber: number]: number },
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
    const blockNumber = Math.round((tx.blockNumber - 300) / 1000) * 1000 + 300; // To avoid parsing every block round to the hour -> leads to approx
    // Deduping and checking sender
    if (prevTxHash !== tx.hash && (hasCode || tx.from.toLowerCase() === address.toLowerCase())) {
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
        }

        const blockEmissions =
          ((difficultyJSON[blockNumber] * OVER_HARDWARE * OVER_DATACENTER * LOSS_GRID) / EFFICIENCY_PSU / HASH_EFFICIENCY) * KCO2_PER_KWH; // In KCO_2

        if (blockEmissions) {
          impact += (parseInt(tx.gas) / gasUsedJSON[blockNumber]) * blockEmissions;
        }
        gas += parseInt(tx.gas);

        // console.log(`Tx emissions: ${impact} KgCO2`);
        // console.log(`Emissions for block ${blockNumber}: ${blockEmissions}`);
        // console.log(`Hashrate for block ${blockNumber}: ${difficultyJSON[blockNumber] / 13.5}`);
        // console.log(`Projected daily emissions for block ${blockNumber}: ${(blockEmissions * 3600 * 24) / 13.5 / 10 ** 6} kT/day`);
        // console.log(`Projected Yearly emissions for block ${blockNumber}: ${(blockEmissions * 365 * 3600 * 24) / 13.5 / 10 ** 9} MT/year`);
      }
    }
  }
  return { impact, gas, tx: txList.length };
};

export default computePoWImpact;
