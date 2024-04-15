/**
 * Exports a static class that wraps react-native-ble-manager
 *
 * This makes the BLE hardware interface compatible with
 * packages like @csllc/cs1816
 *
 */

import RnBle, {
  BleDisconnectPeripheralEvent,
  BleDiscoverPeripheralEvent,
  // BleManagerDidUpdateNotificationStateForEvent,
  BleManagerDidUpdateStateEvent,
  BleManagerDidUpdateValueForCharacteristicEvent,
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
  BleState,
  Peripheral,
} from 'react-native-ble-manager';

import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import EventEmitter from 'eventemitter3';

import {
  Ble,
  BleCharacteristic,
  BleDiscoverCallback,
  BleEventName,
  BleNotifyCallback,
  BlePeripheral,
  DisconnectOptions,
  InitializeOptions,
  Logger,
  StartScanOptions,
} from '@csllc/blejs-types';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// so we can listen to the react-native-bluetooth-manager
let eventHandlers: EmitterSubscription[] = [];

// so we can emit events to our users
let events = new EventEmitter();

// if no logger specified, stub out logging functions
var logger: Logger = {
  info(...a: any) {
    console.log(...a);
  },
  error(...a: any) {
    console.error(...a);
  },
  warn(...a: any) {
    console.log(...a);
  },
  trace(...a: any) {
    console.log(...a);
  },
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve as any, ms));
}

/**
 * Adjust the UUID string to be compatible with the platform
 */
function normalizeUuid(u: string): string {
  // lowercase for android; uppercase for ios
  return Platform.OS === 'android' ? u.toLowerCase() : u.toUpperCase();
}

/**
 * Determine whether two UUID strings are equivalent
 */
function isUuidEqual(u1: string, u2: string) {
  return normalizeUuid(u1) === normalizeUuid(u2);
}

/**
 * Construct a new BlePeripheral
 *
 * @param p The react-native-ble-manager peripheral
 * @returns
 */
function peripheralToBlePeripheral(p: Peripheral): BlePeripheral {
  return {
    address: p.id,
    id: p.id,
    rssi: p.rssi,
    name: p.name || p?.advertising?.localName || '',
    _p: p,
    connected: false,
  };
}

/**
 * Event handler when a peripheral is discovered (while scanning)
 * @param {PeripheralInfo} data
 */
function _onDiscover(event: BleDiscoverPeripheralEvent) {
  events.emit('discover', peripheralToBlePeripheral(event));
}

function _onStopScan(reason: any) {
  logger.trace('_onStopScan');
  events.emit('scanning', false, reason);
  // if (listeners['isScanning']) {
  //   listeners['isScanning'](false, reason);
  // }
}

function _onDisconnect(event: BleDisconnectPeripheralEvent) {
  logger.trace('_onDisconnect', JSON.stringify(event));
  let id = event && event.peripheral;
  events.emit('disconnect', id);
  // id &&
  //   listeners &&
  //   listeners[id] &&
  //   listeners[id]['disconnect'] &&
  //   listeners[id]['disconnect'](id);
}

function _onNotify(data: BleManagerDidUpdateValueForCharacteristicEvent) {
  logger.trace('notify', data.characteristic, data.value.length);

  // if (
  //   listeners[data.peripheral] &&
  //   listeners[data.peripheral][data.service] &&
  //   'function' ===
  //     typeof listeners[data.peripheral][data.service][data.characteristic]
  // ) {
  //   listeners[data.peripheral][data.service][data.characteristic](data);
  // }
}

function _onUpdateState(event: BleManagerDidUpdateStateEvent) {
  _reportState(event.state);
}

function _reportState(state: BleState) {
  logger.trace('State', state);
  switch (state) {
    case 'on':
      events.emit('enable', true);
      break;
    default:
      events.emit('enable', false);
      break;
  }
}

const BleManager: Ble = {
  /**
   * Test to see if BLE functionality is available and allowed on this device
   *
   * @returns true if supported
   */
  async isSupported() {
    // we rely on something else (eg the app store) to prevent the user from even installing the
    // app if the hardware is not compatible.  However there are probably other cases where we are running
    // on hardware that does not have a bluetooth adapter, meaning this function should be enhanced to cover
    // those case(s)
    return true;
  },

  // Check to be sure app has necessary permissions (may prompt user)
  async isAllowed(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      let results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      const allPermissionsGranted = Object.values(results).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED,
      );
      if (allPermissionsGranted) {
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
        let requestResult = await PermissionsAndroid.request(
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
  },

  /**
   * Provides access to the underlying driver.  It is preferable that you
   * don't use this, since it undermines the goal of the wrapper to provide a
   * platform-independent interface to the BLE hardware
   * @returns Object
   */
  driver() {
    return RnBle;
  },

  async initialize(options: InitializeOptions) {
    // use caller's logging interface if specified
    logger = options?.logger || logger;

    await RnBle.start(options?.rnbm);

    logger.trace('Ble started', Platform.OS);

    logger.trace('registering events');
    // Set up event handlers that we can later kill at end-of-life
    eventHandlers = [
      bleManagerEmitter.addListener(
        'BleManagerDiscoverPeripheral',
        _onDiscover,
      ),
      bleManagerEmitter.addListener('BleManagerStopScan', _onStopScan),
      bleManagerEmitter.addListener(
        'BleManagerDisconnectPeripheral',
        _onDisconnect,
      ),
      bleManagerEmitter.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        _onNotify,
      ),
      bleManagerEmitter.addListener('BleManagerDidUpdateState', _onUpdateState),
    ];

    // Make sure we know the state (eg is bluetooth enabled in system settings)
    BleManager.checkState().catch((err: Error) => logger.error(err));
    return true;
  },

  // Attempt to enable bluetooth (prompt the user) if supported
  async enable() {
    if (Platform.OS === 'android') {
      try {
        let info = await RnBle.enableBluetooth();
        logger.trace('enable', info);

        let state = await RnBle.checkState();
        logger.trace('new State', state);
        _reportState(state);
      } catch (e) {
        // Could be: Bluetooth not installed, not turned on, or user declined to turn it on.
        // User should be prompted, if there is an available current android activity
        logger.error('Bluetooth not present/enabled', e);
        //return false;
      }
    }
    return true;
  },

  async checkState() {
    let state = await RnBle.checkState();
    logger.trace('checked State', state);
    _reportState(state);
  },

  // Convenience function to register an event listener
  on(event: BleEventName, fn: (...args: any[]) => void, context?: any) {
    events.on(event, fn, context);
  },

  off(event: BleEventName, fn: (...args: any[]) => void, context?: any) {
    events.off(event, fn, context);
  },

  /**
   * Should be called when the app is shut down, to clean up anything we have going
   */
  async destroy() {
    if (eventHandlers) {
      logger.trace('Destroy:Removing event handlers...');
      for (const l of eventHandlers) {
        l.remove();
      }
      eventHandlers = [];
    }
    events.removeAllListeners();
  },

  async getKnownDevices(services: string[]): Promise<BlePeripheral[]> {
    services = services.map(s => normalizeUuid(s));

    let bondedPeripherals: Peripheral[] = [];
    let connectedPeripherals: Peripheral[] = [];

    if (Platform.OS === 'ios') {
      // BleManager does not have an interface for this currently; we would like to use the retrievePeripheralsWithIdentifiers:
      // method to retrieve already-known devices
    } else {
      bondedPeripherals = await RnBle.getBondedPeripherals();
      // Each peripheral in returned array will have id and name properties
      logger.trace(
        'Bonded peripherals: ',
        bondedPeripherals.map(p => p.id),
      );
    }

    connectedPeripherals = await RnBle.getConnectedPeripherals(services);

    logger.trace(
      'connected peripherals',
      connectedPeripherals.map(p => p.id),
    );

    return [
      ...bondedPeripherals.map(p => peripheralToBlePeripheral(p)),
      ...connectedPeripherals.map(p => peripheralToBlePeripheral(p)),
    ];
  },

  async startScan(
    services: string[],
    cb: BleDiscoverCallback | null,
    options: StartScanOptions,
  ) {
    let ms = (options && options.duration) || 10000;
    let allowDuplicates = (options && options.duplicates) || true;
    logger.trace('Start scan...', ms, allowDuplicates);
    services = services.map(s => normalizeUuid(s));

    // register the supplied callback for discover events
    if (cb) {
      events.on('discover', cb);
    }

    await RnBle.scan(services, 0, allowDuplicates, {
      matchMode: BleScanMatchMode.Sticky,
      scanMode: BleScanMode.LowLatency,
      callbackType: BleScanCallbackType.AllMatches,
    });

    // android does not seem to report the BleManagerStopScan after the scan duration, so handle the duration here
    // setTimeout(() => {
    //   console.log('TIEMEOUT');
    //   BleManager.stopScan();
    // }, 5000);

    events.emit('scanning', true);
  },

  async stopScan() {
    logger.trace('Stop scan...');
    events.off('discover');
    return RnBle.stopScan();
  },

  async connect(peripheral: BlePeripheral) {
    logger.trace('Connect', peripheral.id);

    await RnBle.connect(peripheral.id);

    // this from the react-native-ble-manager example...
    // before retrieving services, it is often a good idea to let bonding & connection finish properly
    await sleep(900);
  },

  async disconnect(peripheral: BlePeripheral, options?: DisconnectOptions) {
    let force = options?.rnbm?.force === true;

    logger.trace('Disconnect', peripheral.id);

    await RnBle.disconnect(peripheral.id, force);
    return true;
  },

  /**
   * Read the signal level of the peripheral
   *
   * @returns Promise(number)
   */
  rssi(peripheral: BlePeripheral) {
    return RnBle.readRSSI(peripheral.id);
  },

  async read(
    peripheral: BlePeripheral,
    characteristic: BleCharacteristic,
  ): Promise<number[]> {
    const data = await RnBle.read(
      peripheral.id,
      characteristic._c.service,
      characteristic._c.characteristic,
    );

    return data;
  },

  write(
    peripheral: BlePeripheral,
    characteristic: BleCharacteristic,
    data: number[],
  ): Promise<void> {
    return RnBle.write(
      peripheral.id,
      characteristic._c.service,
      characteristic._c.characteristic,
      data,
    );
  },

  subscribe(
    peripheral: BlePeripheral,
    characteristic: BleCharacteristic,
    cb: BleNotifyCallback,
  ) {
    logger.trace('subscribe', peripheral.id, characteristic.uuid);

    // add the callback to our listeners

    // Ble.listeners.p[peripheral.id][characteristic._c.service] =
    //   Ble.listeners.p[peripheral.id][characteristic._c.service] || {};
    // Ble.listeners.p[peripheral.id][characteristic._c.service][
    //   characteristic.uuid
    // ] = cb;
    return RnBle.startNotification(
      peripheral.id,
      characteristic._c.service,
      characteristic._c.characteristic,
    );
  },

  unsubscribe(peripheral: BlePeripheral, characteristic: BleCharacteristic) {
    return RnBle.stopNotification(
      peripheral.id,
      characteristic._c.service,
      characteristic.uuid,
    );
  },

  // Register an event handler for when peripheral disconnects
  // static async onDisconnect(peripheral: BlePeripheral, cb: BleStringCallback) {
  //   logger.trace('set disconnect listener for', peripheral.id);
  //   if (Ble.listeners.disconnect) {
  //     logger.warn(
  //       'Only one disconnect listener is supported.  The old listener was discarded',
  //     );
  //   }

  //   Ble.listeners.disconnect = cb;
  // }

  // static async onScanStatus(cb: BleBooleanCallback) {
  //   Ble.listeners.isScanning = cb;
  // }

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
  async findCharacteristics(
    peripheral: BlePeripheral,
    service: string,
    wanted: { name: string; characteristic: string; required: boolean }[],
  ) {
    let result = new Map<string, BleCharacteristic>();
    logger.trace('findCharacteristics', peripheral.id, normalizeUuid(service));

    const peripheralInfo = await RnBle.retrieveServices(peripheral.id, [
      normalizeUuid(service),
    ]);

    if (peripheralInfo && peripheralInfo.characteristics) {
      for (const w in wanted) {
        let found = peripheralInfo.characteristics.find(c => {
          return isUuidEqual(wanted[w].characteristic, c.characteristic);
        });

        if (found) {
          result.set(wanted[w].name, {
            uuid: found.characteristic,
            _c: found,
          });
        } else if (wanted[w].required) {
          throw new Error('Required Characteristic not found');
        }
      }
    }

    return result;
  },
};

export default BleManager;
