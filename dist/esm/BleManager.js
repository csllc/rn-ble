import BleManager, { BleScanCallbackType, BleScanMatchMode, BleScanMode, } from 'react-native-ble-manager';
const RnBle = BleManager;
import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform, } from 'react-native';
import EventEmitter from 'eventemitter3';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
let eventHandlers = [];
let events = new EventEmitter();
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
function peripheralToBlePeripheral(p) {
    var _a;
    return {
        address: p.id,
        id: p.id,
        rssi: p.rssi,
        name: p.name || ((_a = p === null || p === void 0 ? void 0 : p.advertising) === null || _a === void 0 ? void 0 : _a.localName) || '',
        _p: p,
        connected: false,
    };
}
function _onDiscover(event) {
    events.emit('discover', peripheralToBlePeripheral(event));
}
function _onStopScan(reason) {
    logger.trace('_onStopScan');
    events.emit('scanning', false, reason);
}
function _onDisconnect(event) {
    logger.trace('_onDisconnect', JSON.stringify(event));
    let id = event && event.peripheral;
    events.emit('disconnect', id);
}
function _onNotify(data) {
    logger.trace('notify', data.characteristic, data.value.length);
}
function _onUpdateState(event) {
    _reportState(event.state);
}
function _reportState(state) {
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
const RnBleManager = {
    async isSupported() {
        return true;
    },
    async isAllowed() {
        if (Platform.OS === 'android' && Platform.Version >= 31) {
            let results = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ]);
            const allPermissionsGranted = Object.values(results).every((status) => status === PermissionsAndroid.RESULTS.GRANTED);
            if (allPermissionsGranted) {
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
    },
    driver() {
        return RnBle;
    },
    async initialize(options) {
        logger = (options === null || options === void 0 ? void 0 : options.logger) || logger;
        console.log('RnBle', RnBle, RnBle.start);
        await RnBle.start(options === null || options === void 0 ? void 0 : options.rnbm);
        console.log('started');
        logger.trace('Ble started', Platform.OS);
        logger.trace('registering events');
        eventHandlers = [
            bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', _onDiscover),
            bleManagerEmitter.addListener('BleManagerStopScan', _onStopScan),
            bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', _onDisconnect),
            bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', _onNotify),
            bleManagerEmitter.addListener('BleManagerDidUpdateState', _onUpdateState),
        ];
        RnBleManager.checkState().catch((err) => logger.error(err));
        return true;
    },
    async enable() {
        if (Platform.OS === 'android') {
            try {
                let info = await RnBle.enableBluetooth();
                logger.trace('enable', info);
                let state = await RnBle.checkState();
                logger.trace('new State', state);
                _reportState(state);
            }
            catch (e) {
                logger.error('Bluetooth not present/enabled', e);
            }
        }
        return true;
    },
    async checkState() {
        let state = await RnBle.checkState();
        logger.trace('checked State', state);
        _reportState(state);
    },
    on(event, fn, context) {
        events.on(event, fn, context);
    },
    off(event, fn, context) {
        events.off(event, fn, context);
    },
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
    async getKnownDevices(services) {
        services = services.map(s => normalizeUuid(s));
        let bondedPeripherals = [];
        let connectedPeripherals = [];
        if (Platform.OS === 'ios') {
        }
        else {
            bondedPeripherals = await RnBle.getBondedPeripherals();
            logger.trace('Bonded peripherals: ', bondedPeripherals.map(p => p.id));
        }
        connectedPeripherals = await RnBle.getConnectedPeripherals(services);
        logger.trace('connected peripherals', connectedPeripherals.map(p => p.id));
        return [
            ...bondedPeripherals.map(p => peripheralToBlePeripheral(p)),
            ...connectedPeripherals.map(p => peripheralToBlePeripheral(p)),
        ];
    },
    async startScan(services, cb, options) {
        let ms = (options && options.duration) || 10000;
        let allowDuplicates = (options && options.duplicates) || true;
        logger.trace('Start scan...', ms, allowDuplicates);
        services = services.map(s => normalizeUuid(s));
        if (cb) {
            events.on('discover', cb);
        }
        await RnBle.scan(services, 0, allowDuplicates, {
            matchMode: BleScanMatchMode.Sticky,
            scanMode: BleScanMode.LowLatency,
            callbackType: BleScanCallbackType.AllMatches,
        });
        events.emit('scanning', true);
    },
    async stopScan() {
        logger.trace('Stop scan...');
        events.off('discover');
        return RnBle.stopScan();
    },
    async connect(peripheral) {
        logger.trace('Connect', peripheral.id);
        await RnBle.connect(peripheral.id);
        await sleep(900);
    },
    async disconnect(peripheral, options) {
        var _a;
        let force = ((_a = options === null || options === void 0 ? void 0 : options.rnbm) === null || _a === void 0 ? void 0 : _a.force) === true;
        logger.trace('Disconnect', peripheral.id);
        await RnBle.disconnect(peripheral.id, force);
        return true;
    },
    rssi(peripheral) {
        return RnBle.readRSSI(peripheral.id);
    },
    async read(peripheral, characteristic) {
        const data = await RnBle.read(peripheral.id, characteristic._c.service, characteristic._c.characteristic);
        return data;
    },
    write(peripheral, characteristic, data) {
        return RnBle.write(peripheral.id, characteristic._c.service, characteristic._c.characteristic, data);
    },
    subscribe(peripheral, characteristic, cb) {
        logger.trace('subscribe', peripheral.id, characteristic.uuid);
        return RnBle.startNotification(peripheral.id, characteristic._c.service, characteristic._c.characteristic);
    },
    unsubscribe(peripheral, characteristic) {
        return RnBle.stopNotification(peripheral.id, characteristic._c.service, characteristic.uuid);
    },
    async findCharacteristics(peripheral, service, wanted) {
        let result = new Map();
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
                }
                else if (wanted[w].required) {
                    throw new Error('Required Characteristic not found');
                }
            }
        }
        return result;
    },
};
export default RnBleManager;
//# sourceMappingURL=BleManager.js.map