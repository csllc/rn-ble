/**
 * Exports a static class that wraps react-native-ble-manager
 *
 * This makes the BLE hardware interface a bit more generic and compatible
 * with modules like @csllc/cs1816-rn
 *
 */

import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules } from 'react-native';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

let listeners = {};

export const Ble = class {

  static async initialize(options) {
    //console.log('Ble::initialize', Ble);
    await BleManager.start(options);

    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      Ble.onNotify);
  }

  static async startScan(services, options) {
    console.log('scan');
    let seconds = options && options.duration || 5000;
    let allowDuplicates = options && options.duplicates || false;
    return BleManager.scan(services, seconds / 1000, allowDuplicates, options);
  }

  static async stopScan() {
    return BleManager.stopScan();
  }

  static async connect(peripheral) {
    await BleManager.connect(peripheral.id);
    return await BleManager.retrieveServices(peripheral.id);
  }

  static disconnect(peripheral, options) {
    return BleManager.disconnect(peripheral.id, options);
  }


  static read(peripheral, service, characteristic) {
    return BleManager.read(peripheral.id, service, characteristic);
  }


  static write(peripheral, service, characteristic, data) {
    return BleManager.write(peripheral.id, service, characteristic, data);
  }

  static subscribe(peripheral, service, characteristic, cb) {
    //console.log('subscribe', characteristic, peripheral.id);

    // add the callback to our listeners
    listeners[peripheral.id] = listeners[peripheral.id] || {};
    listeners[peripheral.id][service] = listeners[peripheral.id][service] || {};
    listeners[peripheral.id][service][characteristic] = cb;
    return BleManager.startNotification(peripheral.id, service, characteristic);
  }

  static unsubscribe(peripheral, service, characteristic) {

  }

  static onNotify(data) {
    //console.log('onNotify', data, listeners);

    if(listeners[data.peripheral] &&
      listeners[data.peripheral][data.service] &&
      'function' === typeof listeners[data.peripheral][data.service][data.characteristic]) {

      listeners[data.peripheral][data.service][data.characteristic](data);
    }
  }
};
