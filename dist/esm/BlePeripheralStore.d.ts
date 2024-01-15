import { BlePeripheral, Logger } from '@csllc/blejs-types';
type Listener = () => void;
export declare class BlePeripheralState {
    id: string;
    name: string;
    rssi: number;
    connecting: boolean;
    connected: boolean;
    known: boolean;
    p: BlePeripheral;
    constructor(p: BlePeripheral);
    destroy(): void;
}
export declare const BlePeripheralStore: {
    initialize(options: {
        logger?: Logger;
    }): void;
    destroy(): void;
    remove(id: string): void;
    subscribe(listener: Listener): () => void;
    getSnapshot(): Map<string, BlePeripheralState>;
    connect(bp: BlePeripheralState): Promise<void>;
    disconnect(bp: BlePeripheralState): Promise<boolean | void>;
};
export {};
