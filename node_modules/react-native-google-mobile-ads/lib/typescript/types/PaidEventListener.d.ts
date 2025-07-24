import { RevenuePrecisions } from '../common/constants';
export type PaidEvent = {
    currency: string;
    precision: RevenuePrecisions;
    value: number;
};
export type PaidEventListener = (event: PaidEvent) => void;
//# sourceMappingURL=PaidEventListener.d.ts.map