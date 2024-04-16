/**
 * Exports a static interface that wraps react-native-ble-manager
 *
 * This makes the BLE hardware interface compatible with
 * packages like @csllc/cs1816
 *
 */

export { default as BleManager } from './BleManager';
export * from './BlePeripheralStore';
export * from './BleStatusStore';
