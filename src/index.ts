/**
 * Exports a static class that wraps react-native-ble-manager
 *
 * This makes the BLE hardware interface compatible with
 * packages like @csllc/cs1816
 *
 */

// export * from './types';
export * from '@csllc/rn-mb-ble/src/BleManager';
export {BlePeripheralStore, BlePeripheralState} from './BlePeripheralStore';
export {BleStatusStore, BleState} from './BleStatusStore';
