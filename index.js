/**
 * Exports a static class that wraps react-native-ble-manager
 *
 * This makes the BLE hardware interface compatible with
 * packages like @csllc/cs1816
 *
 */

import BleManager from 'react-native-ble-manager';
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

let listeners = {};

// if no logger specified, stub out logging functions
var logger = {
  info() {
    console.log(...arguments);
  },
  error() {
    console.error(...arguments);
  },
  trace() {
    console.log(...arguments);
  },
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class Peripheral {
  constructor(p) {
    // keep the original peripheral object reference around but kinda private
    // since it is unique to the platform
    this._p = p;
    this.address = p.id;
    this.id = p.id;
    this.rssi = p.rssi;
    this.name = p.name || p?.advertising?.localName;
  }
}

/**
 * Adjust the UUID string to be compatible with the platform
 *
 * @param      {string}  u       { the uuid }
 * @return     {string}  { normalized uuid }
 */
function normalizeUuid(u) {
  if (u) {
    // lowercase for android; uppercase for ios
    return Platform.OS === 'android' ? u.toLowerCase() : u.toUpperCase();
  }
}

/**
 * Determine whether two UUID strings are equivalent
 *
 * case-insensitive and ignores hyphens.
 *
 * @param      {string}  u1      The first UUID
 * @param      {string}  u2      The second UUID
 * @return     {Boolean}  True if uuid equal, False otherwise.
 */
function isUuidEqual(u1, u2) {
  return normalizeUuid(u1) === normalizeUuid(u2);
}

const Ble = class {
  /**
   * Test to see if BLE functionality is available and allowed on this device
   *
   * @returns true if supported
   */
  static async isSupported() {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      let result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      if (
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED
      ) {
        logger.trace(
          '[handleAndroidPermissions] User accepts runtime permissions android 12+',
        );
        return true;
      } else {
        logger.trace(
          '[handleAndroidPermissions] User refuses runtime permissions android 12+',
        );
        return false;
      }
    } else if (Platform.OS === 'android' && Platform.Version >= 23) {
      let checkResult = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (checkResult) {
        logger.trace(
          '[handleAndroidPermissions] runtime permission Android <12 already OK',
        );

        return true;
      } else {
        let requestResult = PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (requestResult == PermissionsAndroid.RESULTS.GRANTED) {
          logger.trace(
            '[handleAndroidPermissions] User accepts runtime permission android <12',
          );
          return true;
        } else {
          logger.trace(
            '[handleAndroidPermissions] User refuses runtime permission android <12',
          );
          return false;
        }
      }
    }

    // ios
    return true;
  }

  /**
   * Provides access to the underlying driver.  It is preferable that you
   * don't use this, since it undermines the goal of the wrapper to provide a
   * platform-independent interface to the BLE hardware
   * @returns Object
   */
  static driver() {
    return BleManager;
  }

  static async initialize(options) {
    // use caller's logging interface if specified
    logger = (options && options.logger) || logger;
    delete options.logger;

    await BleManager.start({showAlert: true});

    logger.trace('Ble started', Platform.OS);

    if (Platform.OS === 'android') {
      // NOTE: in version 10 of th react-native-ble-manager, enableBluetooth() crashes the
      // app if bluetooth is turned off (and there is no getCurrentActivity()).  Until this is fixed
      // or a workaround determined, I'm leaving the following out:
      try {
        let info = await BleManager.enableBluetooth();
        console.log('enable', info);
      } catch (e) {
        // Could be: Bluetooth not installed, not turned on, or user declined to turn it on.
        // User should be prompted, if there is an available current android activity
        logger.error('Bluetooth not present/enabled', e);
        //return false;
      }
    }

    let state = await BleManager.checkState();
    logger.trace('init State', state);

    Ble.listeners = [
      bleManagerEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        Ble._onDiscover,
      ),
      bleManagerEmitter.addListener('BleManagerStopScan', Ble._onStopScan),
      bleManagerEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        Ble._onDisconnect,
      ),
      bleManagerEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        Ble._onNotify,
      ),
      bleManagerEmitter.addListener(
        'BleManagerDidUpdateState',
        Ble._onUpdateState,
      ),
    ];
  }

  /**
   * Should be called when the app is shut down, to clean up anything we have going
   */
  static async destroy() {
    if (Ble.listeners) {
      logger.trace('Destroy:Removing listeners...');
      for (const listener of Ble.listeners) {
        listener.remove();
      }
      listeners = {};
    }
  }

  static async getKnownDevices(services, ids) {
    services = services.map(s => normalizeUuid(s));

    let bondedPeripherals = [];
    let connectedPeripherals = [];
    if (Platform.OS === 'ios') {
      // BleManager does not have an interface for this currently; we would like to use the retrievePeripheralsWithIdentifiers:
      // method to retrieve already-known devices
    } else {
      bondedPeripherals = await BleManager.getBondedPeripherals(services);
      // Each peripheral in returned array will have id and name properties
      logger.trace(
        'Bonded peripherals: ',
        bondedPeripherals.map(p => p.id),
      );
    }

    connectedPeripherals = await BleManager.getConnectedPeripherals(services);

    logger.trace(
      'connected peripherals',
      connectedPeripherals.map(p => p.id),
    );

    // initialize our listeners for all known devices
    bondedPeripherals.forEach(d => (listeners[d.id] = listeners[d.id] || {}));
    connectedPeripherals.forEach(
      d => (listeners[d.id] = listeners[d.id] || {}),
    );

    return [...bondedPeripherals, ...connectedPeripherals];
  }

  static async startScan(services, cb, options) {
    logger.trace('Start scan...', services);
    let seconds = (options && options.duration) || 5000;
    let allowDuplicates = (options && options.duplicates) || true;

    services = services.map(s => normalizeUuid(s));

    Ble.scanCb = cb;

    await BleManager.scan(services, seconds / 1000, allowDuplicates, {
      matchMode: 2, //BleScanMatchMode.Sticky,
      scanMode: 2, //BleScanMode.LowLatency,
      callbackType: 1, //BleScanCallbackType.AllMatches,
    });

    if (listeners['isScanning']) {
      listeners['isScanning'](true);
    }
  }

  static async stopScan() {
    logger.trace('Stop scan...');
    Ble.scanCb = null;
    return BleManager.stopScan();
  }

  static async connect(peripheral) {
    logger.trace('Connect', peripheral.id);

    // if (Platform.OS === 'android') {
    //   await BleManager.createBond(peripheral.id);
    // }
    await BleManager.connect(peripheral.id);

    // this from the react-native-ble-manager example...
    // before retrieving services, it is often a good idea to let bonding & connection finish properly
    await sleep(900);
  }

  static async disconnect(peripheral, options) {
    logger.trace('Disconnect', peripheral.id);

    await BleManager.disconnect(peripheral.id, options);
    // if (Platform.OS === 'android') {
    //   await BleManager.removeBond(peripheral.id);
    // }
  }

  /**
   * Read the signal level of the peripheral
   *
   * @returns Promise(number)
   */
  static rssi(peripheral) {
    return BleManager.readRSSI(peripheral.id);
  }

  static async read(peripheral, characteristic) {
    const data = await BleManager.read(
      peripheral.id,
      characteristic.service,
      characteristic.characteristic,
    );

    return data;
  }

  static write(peripheral, characteristic, data) {
    return BleManager.write(
      peripheral.id,
      characteristic.service,
      characteristic.characteristic,
      data,
    );
  }

  static subscribe(peripheral, characteristic, cb) {
    logger.trace('subscribe', peripheral.id, characteristic.characteristic);

    // add the callback to our listeners

    listeners[peripheral.id][characteristic.service] =
      listeners[peripheral.id][characteristic.service] || {};
    listeners[peripheral.id][characteristic.service][
      characteristic.characteristic
    ] = cb;
    return BleManager.startNotification(
      peripheral.id,
      characteristic.service,
      characteristic.characteristic,
    );
  }

  static unsubscribe(peripheral, characteristic) {
    return BleManager.stopNotification(
      peripheral.id,
      characteristic.service,
      characteristic.characteristic,
    );
  }

  // Register an event handler for when peripheral disconnects
  static async onDisconnect(peripheral, cb) {
    logger.trace('set disconnect listener for', peripheral.id);
    if (listeners[peripheral.id]['disconnect']) {
      logger.warn(
        'Only one disconnect listener is supported.  The old listener was discarded',
      );
    }

    listeners[peripheral.id]['disconnect'] = cb;
  }

  static async onScanStatus(cb) {
    listeners['isScanning'] = cb;
  }

  /**
   * Maps the caller's characteristics to the device characteristics
   *
   * If all services/characteristics cannot be found, it is acceptable for
   * this function to either reject, or return an array shorter than the
   * wanted array.
   *
   * @param      {Object}   peripheral  The peripheral we discover(ed)
   * @param      {string}   service     The UUID of the service
   * @param      {Array}    wanted      The characteristics the user is interested in
   * @return     {Promise}  Resolves with an array of corresponding characteristics
   */
  static async findCharacteristics(peripheral, service, wanted) {
    let result = {};
    logger.trace('findCharacteristics', peripheral.id, normalizeUuid(service));

    const peripheralInfo = await BleManager.retrieveServices(peripheral.id, [
      normalizeUuid(service),
    ]);

    if (peripheralInfo && peripheralInfo.characteristics) {
      for (const w in wanted) {
        let found = peripheralInfo.characteristics.find(c => {
          return isUuidEqual(wanted[w].characteristic, c.characteristic);
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

  /**
   * Event handler when a peripheral is discovered (while scanning)
   * @param {PeripheralInfo} data
   */
  static _onDiscover(data) {
    listeners[data.id] = listeners[data.id] || {};

    if (Ble.scanCb) {
      Ble.scanCb(new Peripheral(data));
    }
  }

  static _onStopScan(reason) {
    logger.trace('_onStopScan');
    if (listeners['isScanning']) {
      listeners['isScanning'](false, reason);
    }
  }

  static _onDisconnect(event) {
    logger.trace('_onDisconnect', JSON.stringify(event));
    let id = event && event.peripheral;
    id &&
      listeners &&
      listeners[id] &&
      listeners[id]['disconnect'] &&
      listeners[id]['disconnect'](id);
  }

  static _onNotify(data) {
    logger.trace('notify', data.characteristic, data.value.length);
    if (
      listeners[data.peripheral] &&
      listeners[data.peripheral][data.service] &&
      'function' ===
        typeof listeners[data.peripheral][data.service][data.characteristic]
    ) {
      listeners[data.peripheral][data.service][data.characteristic](data);
    }
  }

  static _onUpdateState(data) {
    logger.trace('State', data.state);
    /// android: 'turning_off', 'off'
  }
};

export {Ble, Peripheral};
