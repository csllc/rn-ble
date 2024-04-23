/**
 * Exports a static class that wraps react-native-ble-manager
 *
 * This makes the BLE hardware interface compatible with
 * packages like @csllc/cs1816
 *
 */

import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules } from 'react-native';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

let listeners = {};

export const Ble = class {

  static async initialize(options) {
    await BleManager.start(options);

    bleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      Ble._onNotify);
  }

  static async startScan(services, options) {
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


  static read(peripheral, characteristic) {
    return BleManager.read(peripheral.id, characteristic.service, characteristic.characteristic);
  }


  static write(peripheral, characteristic, data) {
    return BleManager.write(peripheral.id, characteristic.service, characteristic.characteristic, data);
  }

  static subscribe(peripheral, characteristic, cb) {

    // add the callback to our listeners
    listeners[peripheral.id] = listeners[peripheral.id] || {};
    listeners[peripheral.id][characteristic.service] = listeners[peripheral.id][characteristic.service] || {};
    listeners[peripheral.id][characteristic.service][characteristic.characteristic] = cb;
    return BleManager.startNotification(peripheral.id, characteristic.service, characteristic.characteristic);
  }

  static unsubscribe(peripheral,characteristic) {
    return BleManager.stopNotification(peripheral.id, characteristic.service, characteristic.characteristic);
  }

  static _onNotify(data) {

    if(listeners[data.peripheral] &&
      listeners[data.peripheral][data.service] &&
      'function' === typeof listeners[data.peripheral][data.service][data.characteristic]) {

      listeners[data.peripheral][data.service][data.characteristic](data);
    }
  }

  static async findCharacteristics(peripheral, service, wanted) {
    let result = {};

    let foundService = await BleManager.retrieveServices(peripheral.id);
    
    foundService = foundService.characteristics.filter(element => {
      return element.service == service;
    });
    if (foundService && foundService.length > 0) {
      for (const w in wanted) {
        let found = foundService.find(c => {
          return c.characteristic == wanted[w].characteristic;
        });

        if (found) {
          result[wanted[w].name] = found;
        } else if (wanted[w].required) {
          throw new Error('Required Characteristic not found');
        }
      }
    }
    return result;
  }
};
