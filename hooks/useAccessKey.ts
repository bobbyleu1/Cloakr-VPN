// hooks/useAccessKey.ts
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const STORE_KEY = 'outline-vpn-access-key';


export function useAccessKey() {
  const [key, setKey] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then(setKey);
  }, []);

  const saveKey = async (val: string) => {
    await SecureStore.setItemAsync(STORE_KEY, val);
    setKey(val);
  };

  return { key, saveKey };
}
