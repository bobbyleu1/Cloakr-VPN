import { NativeModules, NativeEventEmitter } from 'react-native';

export type NativeVpnState =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'DISCONNECTING'
  | 'ERROR';

// Native module declared in Swift as @objc(OutlineVPN)
type OutlineVPNModule = {
  connect(key: string): Promise<void>;
  disconnect(): Promise<void>;
};

const NativeVPN = NativeModules.OutlineVPN as OutlineVPNModule | undefined;

let nativeEmitter: NativeEventEmitter | null = null;
if (NativeVPN) {
  nativeEmitter = new NativeEventEmitter(NativeModules.OutlineVPN);
}

const listeners = new Set<(s: NativeVpnState) => void>();
const emit = (s: NativeVpnState) => listeners.forEach(cb => cb(s));

if (nativeEmitter) {
  nativeEmitter.addListener('vpnStateChanged', (evt: { state: NativeVpnState }) => {
    emit(evt.state);
  });
}

export function observeVPN(cb: (s: NativeVpnState) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function connectVPN(key: string) {
  if (NativeVPN?.connect) return NativeVPN.connect(key);
  emit('CONNECTING');
  await wait(1500);
  emit('CONNECTED');
}

export async function disconnectVPN() {
  if (NativeVPN?.disconnect) return NativeVPN.disconnect();
  emit('DISCONNECTING');
  await wait(1200);
  emit('DISCONNECTED');
}

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
