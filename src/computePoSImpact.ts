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

  const filteredBlockNumbers = Object.keys(validatorJSON).filter((b) => {
    return gasUsedJSON[parseInt(b)] !== undefined;
  });
  for (const tx of txList) {
    // Floor to the previous XX300 block to use our cache
    let blockNumber = Math.round((tx.blockNumber - 300) / 1000) * 1000 + 300; // To avoid parsing every block round to the hour -> leads to approx
    blockNumber = Math.max(MERGE_BLOCK, blockNumber);
    // Deduping and checking sender
    if (prevTxHash !== tx.hash && (hasCode || tx.from.toLowerCase() === address.toLowerCase())) {
      {
        if (!validatorJSON[blockNumber] || !gasUsedJSON[blockNumber]) {
          // Take the closest blockNumber if the data is not loaded locally
          blockNumber = parseInt(
            filteredBlockNumbers.reduce(function (prev, curr) {
              return Math.abs(parseInt(curr) - blockNumber) < Math.abs(parseInt(prev) - blockNumber) ? curr : prev;
            })
          );
        }

        // Emissions linked to a block are estimated by computing the CO2 emitted by X computers running during 12 seconds
        // X being the number of runnings validators
        // We take into account instant consumption and a hardware deprecation factor
        const blockEmissions =
          (validatorJSON[blockNumber] * ((CONSUMPTION_HARDWARE * 12) / 3600 + PRODUCTION_HARDWARE) * KCO2_PER_KWH) / 1e3; // In tCO_2

        if (blockEmissions) {
          impact += (parseInt(tx.gas) / (!!gasUsedJSON[blockNumber] ? gasUsedJSON[blockNumber] : 15e6)) * blockEmissions;
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
