import { useKeepAwake } from 'expo-keep-awake';

export const useWakeLock = () => {
  useKeepAwake();
};
