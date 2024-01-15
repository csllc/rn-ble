var _a;
import BleManager, { BleScanCallbackType, BleScanMatchMode, BleScanMode, } from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, } from 'react-native';
import EventEmitter from 'eventemitter3';
import { BlePeripheral } from './BlePeripheral';
import { BleCharacteristic } from './BleCharacteristic';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
var logger = {
    info(...a) {
        console.log(...a);
    },
    error(...a) {
        console.error(...a);
    },
    warn(...a) {
        console.log(...a);
    },
    trace(...a) {
        console.log(...a);
    },
};
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function normalizeUuid(u) {
    return Platform.OS === 'android' ? u.toLowerCase() : u.toUpperCase();
}
function isUuidEqual(u1, u2) {
    return normalizeUuid(u1) === normalizeUuid(u2);
}
export const Ble = (_a = class Ble extends EventEmitter {
        static async isSupported() {
            return true;
        }
        static async isAllowed() {
            if (Platform.OS === 'android' && Platform.Version >= 31) {
                let result = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                ]);
                if (result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
                    PermissionsAndroid.RESULTS.GRANTED &&
                    result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
                        PermissionsAndroid.RESULTS.GRANTED) {
                    logger.trace('[handleAndroidPermissions] User accepts runtime permissions android 12+');
                    return true;
                }
                else {
                    logger.trace('[handleAndroidPermissions] User refuses runtime permissions android 12+');
                    return false;
                }
            }
            else if (Platform.OS === 'android' && Platform.Version >= 23) {
                let checkResult = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                if (checkResult) {
                    logger.trace('[handleAndroidPermissions] runtime permission Android <12 already OK');
                    return true;
                }
                else {
                    let requestResult = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                    if (requestResult == PermissionsAndroid.RESULTS.GRANTED) {
                        logger.trace('[handleAndroidPermissions] User accepts runtime permission android <12');
                        return true;
                    }
                    else {
                        logger.trace('[handleAndroidPermissions] User refuses runtime permission android <12');
                        return false;
                    }
                }
            }
            return true;
        }
        static driver() {
            return BleManager;
        }
        static async initialize(options) {
            logger = (options === null || options === void 0 ? void 0 : options.logger) || logger;
            await BleManager.start(options === null || options === void 0 ? void 0 : options.rnbm);
            logger.trace('Ble started', Platform.OS);
            logger.trace('registering events');
            _a.eventHandlers = [
                bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', _a._onDiscover),
                bleManagerEmitter.addListener('BleManagerStopScan', _a._onStopScan),
                bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', _a._onDisconnect),
                bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', _a._onNotify),
                bleManagerEmitter.addListener('BleManagerDidUpdateState', _a._onUpdateState),
            ];
            _a.checkState().catch((err) => logger.error(err));
        }
        static async enable() {
            if (Platform.OS === 'android') {
                try {
                    let info = await BleManager.enableBluetooth();
                    logger.trace('enable', info);
                    let state = await BleManager.checkState();
                    logger.trace('new State', state);
                    _a._reportState(state);
                }
                catch (e) {
                    logger.error('Bluetooth not present/enabled', e);
                }
            }
        }
        static async checkState() {
            let state = await BleManager.checkState();
            logger.trace('checked State', state);
            _a._reportState(state);
        }
        static on(event, fn, context) {
            _a.events.on(event, fn, context);
            return _a;
        }
        static off(event, fn, context) {
            _a.events.off(event, fn, context);
            return _a;
        }
        static async destroy() {
            if (_a.eventHandlers) {
                logger.trace('Destroy:Removing event handlers...');
                for (const l of _a.eventHandlers) {
                    l.remove();
                }
                _a.eventHandlers = [];
            }
            _a.events.removeAllListeners();
        }
        static async getKnownDevices(services) {
            services = services.map(s => normalizeUuid(s));
            let bondedPeripherals = [];
            let connectedPeripherals = [];
            if (Platform.OS === 'ios') {
            }
            else {
                bondedPeripherals = await BleManager.getBondedPeripherals();
                logger.trace('Bonded peripherals: ', bondedPeripherals.map(p => p.id));
            }
            connectedPeripherals = await BleManager.getConnectedPeripherals(services);
            logger.trace('connected peripherals', connectedPeripherals.map(p => p.id));
            return [
                ...bondedPeripherals.map(p => new BlePeripheral(p)),
                ...connectedPeripherals.map(p => new BlePeripheral(p)),
            ];
        }
        static async startScan(services, cb, options) {
            let ms = (options && options.duration) || 10000;
            let allowDuplicates = (options && options.duplicates) || true;
            logger.trace('Start scan...', ms, allowDuplicates);
            services = services.map(s => normalizeUuid(s));
            if (cb) {
                _a.events.on('discover', cb);
            }
            await BleManager.scan(services, 0, allowDuplicates, {
                matchMode: BleScanMatchMode.Sticky,
                scanMode: BleScanMode.LowLatency,
                callbackType: BleScanCallbackType.AllMatches,
            });
            _a.events.emit('scanning', true);
        }
        static async stopScan() {
            logger.trace('Stop scan...');
            _a.events.off('discover');
            return BleManager.stopScan();
        }
        static async connect(peripheral) {
            logger.trace('Connect', peripheral.id);
            await BleManager.connect(peripheral.id);
            await sleep(900);
        }
        static async disconnect(peripheral, options) {
            var _b;
            let force = ((_b = options === null || options === void 0 ? void 0 : options.rnbm) === null || _b === void 0 ? void 0 : _b.force) === true;
            logger.trace('Disconnect', peripheral.id);
            await BleManager.disconnect(peripheral.id, force);
        }
        static rssi(peripheral) {
            return BleManager.readRSSI(peripheral.id);
        }
        static async read(peripheral, characteristic) {
            const data = await BleManager.read(peripheral.id, characteristic._c.service, characteristic._c.characteristic);
            return data;
        }
        static write(peripheral, characteristic, data) {
            return BleManager.write(peripheral.id, characteristic._c.service, characteristic._c.characteristic, data);
        }
        static subscribe(peripheral, characteristic, cb) {
            logger.trace('subscribe', peripheral.id, characteristic.uuid);
            return BleManager.startNotification(peripheral.id, characteristic._c.service, characteristic._c.characteristic);
        }
        static unsubscribe(peripheral, characteristic) {
            return BleManager.stopNotification(peripheral.id, characteristic._c.service, characteristic.uuid);
        }
        static async findCharacteristics(peripheral, service, wanted) {
            let result = new Map();
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
                        result.set(wanted[w].name, new BleCharacteristic(found));
                    }
                    else if (wanted[w].required) {
                        throw new Error('Required Characteristic not found');
                    }
                }
            }
            return result;
        }
        static _onDiscover(event) {
            _a.events.emit('discover', new BlePeripheral(event));
        }
        static _onStopScan(reason) {
            logger.trace('_onStopScan');
            _a.events.emit('scanning', false, reason);
        }
        static _onDisconnect(event) {
            logger.trace('_onDisconnect', JSON.stringify(event));
            let id = event && event.peripheral;
            _a.events.emit('disconnect', id);
        }
        static _onNotify(data) {
            logger.trace('notify', data.characteristic, data.value.length);
        }
        static _onUpdateState(event) {
            _a._reportState(event.state);
        }
        static _reportState(state) {
            logger.trace('State', state);
            switch (state) {
                case 'on':
                    _a.events.emit('enable', true);
                    break;
                default:
                    _a.events.emit('enable', false);
                    break;
            }
        }
    },
    _a.eventHandlers = [],
    _a.events = new EventEmitter(),
    _a);
//# sourceMappingURL=Ble.js.map