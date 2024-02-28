import { Ble, Logger } from '@csllc/blejs-types';
type Listener = () => void;
export interface BleState {
    isReady?: boolean;
    isAvailable?: boolean;
    isAuthorized?: boolean;
    isEnabled?: boolean;
    isScanning?: boolean;
}
export declare const BleStatusStore: {
    initialize(ble: Ble, options: {
        logger?: Logger;
    }): void;
    destroy(): void;
    enable(): Promise<boolean>;
    checkState(): Promise<undefined>;
    startScan(services: string[], duration: number): Promise<void>;
    stopScan(): Promise<void>;
    subscribe(listener: Listener): () => void;
    getSnapshot(): BleState;
};
export {};
