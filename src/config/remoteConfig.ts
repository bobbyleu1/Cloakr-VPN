export type RemoteConfig = {
  schemaVersion: number;
  ios: {
    activeProductIds: string[];
    featureFlags: {
      premiumModeEnabled: boolean;
    };
  };
  ads: {
    enabled: boolean;
  };
  ui: {
    showManageSubscriptionsLink: boolean;
  };
};

export const DEFAULT_CONFIG: RemoteConfig = {
  schemaVersion: 1,
  ios: {
    activeProductIds: ["cloakr.monthly.unlimited6"],
    featureFlags: {
      premiumModeEnabled: true,
    },
  },
  ads: {
    enabled: true,
  },
  ui: {
    showManageSubscriptionsLink: true,
  },
};

export const REMOTE_URL = "https://bobbyleu1.github.io/cloakr-remote-config/config.json";

export async function fetchRemoteConfig(): Promise<RemoteConfig> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${REMOTE_URL}?v=${Date.now()}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return DEFAULT_CONFIG;
    }

    const config = await response.json();
    return config as RemoteConfig;
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}