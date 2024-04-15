"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_ble_manager_1 = __importStar(require("react-native-ble-manager"));
const react_native_1 = require("react-native");
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const BleManagerModule = react_native_1.NativeModules.BleManager;
const bleManagerEmitter = new react_native_1.NativeEventEmitter(BleManagerModule);
let eventHandlers = [];
let events = new eventemitter3_1.default();
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
    return react_native_1.Platform.OS === 'android' ? u.toLowerCase() : u.toUpperCase();
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
const BleManager = {
    async isSupported() {
        return true;
    },
    async isAllowed() {
        if (react_native_1.Platform.OS === 'android' && react_native_1.Platform.Version >= 31) {
            let results = await react_native_1.PermissionsAndroid.requestMultiple([
                react_native_1.PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                react_native_1.PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ]);
            const allPermissionsGranted = Object.values(results).every((status) => status === react_native_1.PermissionsAndroid.RESULTS.GRANTED);
            if (allPermissionsGranted) {
                logger.trace('[handleAndroidPermissions] User accepts runtime permissions android 12+');
                return true;
            }
            else {
                logger.trace('[handleAndroidPermissions] User refuses runtime permissions android 12+');
                return false;
            }
        }
        else if (react_native_1.Platform.OS === 'android' && react_native_1.Platform.Version >= 23) {
            let checkResult = await react_native_1.PermissionsAndroid.check(react_native_1.PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
            if (checkResult) {
                logger.trace('[handleAndroidPermissions] runtime permission Android <12 already OK');
                return true;
            }
            else {
                let requestResult = await react_native_1.PermissionsAndroid.request(react_native_1.PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                if (requestResult == react_native_1.PermissionsAndroid.RESULTS.GRANTED) {
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
        return react_native_ble_manager_1.default;
    },
    async initialize(options) {
        logger = (options === null || options === void 0 ? void 0 : options.logger) || logger;
        await react_native_ble_manager_1.default.start(options === null || options === void 0 ? void 0 : options.rnbm);
        logger.trace('Ble started', react_native_1.Platform.OS);
        logger.trace('registering events');
        eventHandlers = [
            bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', _onDiscover),
            bleManagerEmitter.addListener('BleManagerStopScan', _onStopScan),
            bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', _onDisconnect),
            bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', _onNotify),
            bleManagerEmitter.addListener('BleManagerDidUpdateState', _onUpdateState),
        ];
        BleManager.checkState().catch((err) => logger.error(err));
        return true;
    },
    async enable() {
        if (react_native_1.Platform.OS === 'android') {
            try {
                let info = await react_native_ble_manager_1.default.enableBluetooth();
                logger.trace('enable', info);
                let state = await react_native_ble_manager_1.default.checkState();
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
        let state = await react_native_ble_manager_1.default.checkState();
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
        if (react_native_1.Platform.OS === 'ios') {
        }
        else {
            bondedPeripherals = await react_native_ble_manager_1.default.getBondedPeripherals();
            logger.trace('Bonded peripherals: ', bondedPeripherals.map(p => p.id));
        }
        connectedPeripherals = await react_native_ble_manager_1.default.getConnectedPeripherals(services);
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
        await react_native_ble_manager_1.default.scan(services, 0, allowDuplicates, {
            matchMode: react_native_ble_manager_1.BleScanMatchMode.Sticky,
            scanMode: react_native_ble_manager_1.BleScanMode.LowLatency,
            callbackType: react_native_ble_manager_1.BleScanCallbackType.AllMatches,
        });
        events.emit('scanning', true);
    },
    async stopScan() {
        logger.trace('Stop scan...');
        events.off('discover');
        return react_native_ble_manager_1.default.stopScan();
    },
    async connect(peripheral) {
        logger.trace('Connect', peripheral.id);
        await react_native_ble_manager_1.default.connect(peripheral.id);
        await sleep(900);
    },
    async disconnect(peripheral, options) {
        var _a;
        let force = ((_a = options === null || options === void 0 ? void 0 : options.rnbm) === null || _a === void 0 ? void 0 : _a.force) === true;
        logger.trace('Disconnect', peripheral.id);
        await react_native_ble_manager_1.default.disconnect(peripheral.id, force);
        return true;
    },
    rssi(peripheral) {
        return react_native_ble_manager_1.default.readRSSI(peripheral.id);
    },
    async read(peripheral, characteristic) {
        const data = await react_native_ble_manager_1.default.read(peripheral.id, characteristic._c.service, characteristic._c.characteristic);
        return data;
    },
    write(peripheral, characteristic, data) {
        return react_native_ble_manager_1.default.write(peripheral.id, characteristic._c.service, characteristic._c.characteristic, data);
    },
    subscribe(peripheral, characteristic, cb) {
        logger.trace('subscribe', peripheral.id, characteristic.uuid);
        return react_native_ble_manager_1.default.startNotification(peripheral.id, characteristic._c.service, characteristic._c.characteristic);
    },
    unsubscribe(peripheral, characteristic) {
        return react_native_ble_manager_1.default.stopNotification(peripheral.id, characteristic._c.service, characteristic.uuid);
    },
    async findCharacteristics(peripheral, service, wanted) {
        let result = new Map();
        logger.trace('findCharacteristics', peripheral.id, normalizeUuid(service));
        const peripheralInfo = await react_native_ble_manager_1.default.retrieveServices(peripheral.id, [
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
exports.default = BleManager;
//# sourceMappingURL=BleManager.js.map