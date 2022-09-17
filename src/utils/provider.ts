import { providers } from 'ethers';

const requireEnvVars = <T extends string>(vars: T[]): Record<typeof vars[number], string> => {
  const missingEnvVars = vars.filter((v) => !process.env[v]);
  if (missingEnvVars.length) {
    throw new Error(`Missing env vars: ${missingEnvVars.join(', ')}`);
  }

  return vars.reduce((acc, envVar) => {
    acc[envVar] = process.env[envVar] as string;
    return acc;
  }, {} as Record<typeof vars[number], string>);
};

const { PROVIDER_MAINNET } = requireEnvVars(['PROVIDER_MAINNET']);

export const NETWORKS = {
  1: PROVIDER_MAINNET,
};
export const httpProvider = (network: keyof typeof NETWORKS) => new providers.JsonRpcProvider(NETWORKS[network]);
