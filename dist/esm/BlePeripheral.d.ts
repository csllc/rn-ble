import { Peripheral } from 'react-native-ble-manager';
export declare class BlePeripheral {
    _p: Peripheral;
    address: string;
    id: string;
    name: string;
    rssi: number;
    constructor(p: Peripheral);
}
