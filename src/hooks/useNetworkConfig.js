import { useSyncExternalStore } from 'react';
import { getNetworkConfig, subscribeNetwork } from '../services/network';

export function useNetworkConfig() {
  return useSyncExternalStore(subscribeNetwork, getNetworkConfig, getNetworkConfig);
}
