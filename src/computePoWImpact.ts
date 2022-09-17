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

  const filteredBlockNumbers = Object.keys(difficultyJSON).filter((b) => {
    return gasUsedJSON[parseInt(b)] !== undefined;
  });

  for (const tx of txList) {
    // Floor to the previous XX300 block to use our cache
    let blockNumber = Math.round((tx.blockNumber - 300) / 1000) * 1000 + 300; // To avoid parsing every block round to the hour -> leads to approx
    // Deduping and checking sender
    if (prevTxHash !== tx.hash && (hasCode || tx.from.toLowerCase() === address.toLowerCase())) {
      {
        if (!difficultyJSON[blockNumber] || !gasUsedJSON[blockNumber]) {
          // Take the closest blockNumber if the data is not loaded locally
          blockNumber = parseInt(
            filteredBlockNumbers.reduce(function (prev, curr) {
              return Math.abs(parseInt(curr) - blockNumber) < Math.abs(parseInt(prev) - blockNumber) ? curr : prev;
            })
          );
        }

        const blockEmissions =
          (((difficultyJSON[blockNumber] * OVER_HARDWARE * OVER_DATACENTER * LOSS_GRID) / EFFICIENCY_PSU / HASH_EFFICIENCY) *
            KCO2_PER_KWH) /
          1e3; // In tCO_2

        if (blockEmissions) {
          impact += (parseInt(tx.gas) / (!!gasUsedJSON[blockNumber] ? gasUsedJSON[blockNumber] : 15e6)) * blockEmissions;
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
