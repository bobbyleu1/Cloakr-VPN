import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { RemoteConfig, DEFAULT_CONFIG, fetchRemoteConfig } from '../config/remoteConfig';

type PremiumConfigContextType = {
  config: RemoteConfig;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PremiumConfigContext = createContext<PremiumConfigContextType | undefined>(undefined);

type PremiumConfigProviderProps = {
  children: ReactNode;
};

export function PremiumConfigProvider({ children }: PremiumConfigProviderProps) {
  const [config, setConfig] = useState<RemoteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const remoteConfig = await fetchRemoteConfig();
      setConfig(remoteConfig);
    } catch (error) {
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadConfig();
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const value: PremiumConfigContextType = {
    config,
    loading,
    refresh,
  };

  return (
    <PremiumConfigContext.Provider value={value}>
      {children}
    </PremiumConfigContext.Provider>
  );
}

export function usePremiumConfig(): PremiumConfigContextType {
  const context = useContext(PremiumConfigContext);
  if (context === undefined) {
    throw new Error('usePremiumConfig must be used within a PremiumConfigProvider');
  }
  return context;
}