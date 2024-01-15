import BleManager from '@csllc/rn-mb-ble/src/BleManager';
var log = {
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
const INIT_STATE = {
    isReady: false,
    isAvailable: false,
    isAuthorized: false,
    isEnabled: false,
    isScanning: false,
};
let state = { ...INIT_STATE };
let listeners = [];
export const BleStatusStore = {
    initialize(options) {
        log = (options === null || options === void 0 ? void 0 : options.logger) || log;
        log.trace('initialize');
        BleManager.on('scanning', onScanning);
        BleManager.on('enable', onEnable);
        async function init() {
            state = { ...INIT_STATE };
            let isAvailable = await BleManager.isSupported();
            let isAuthorized = isAvailable;
            emitChange({ isAvailable, isAuthorized });
        }
        init()
            .then(() => {
            emitChange({ isReady: true });
        })
            .catch(err => log.error('Init failed', err));
    },
    destroy() {
        log.trace('destroy');
        BleManager.off('enable', onEnable);
        BleManager.off('scanning', onScanning);
    },
    async enable() {
        return BleManager.enable();
    },
    async checkState() {
        return BleManager.checkState();
    },
    async startScan(services, duration) {
        log.info('StartScan', duration);
        await BleManager.startScan(services, null, { duration, duplicates: true });
    },
    async stopScan() {
        log.info('StopScan');
        await BleManager.stopScan();
    },
    subscribe(listener) {
        listeners = [...listeners, listener];
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    },
    getSnapshot() {
        return state;
    },
};
function emitChange(update) {
    state = { ...state, ...update };
    log.trace('emitChange', JSON.stringify(update));
    for (let listener of listeners) {
        listener();
    }
}
function onScanning(isScanning) {
    if (state.isScanning !== isScanning) {
        emitChange({ isScanning });
    }
}
function onEnable(isEnabled) {
    if (state.isEnabled !== isEnabled) {
        emitChange({ isEnabled });
    }
}
//# sourceMappingURL=BleStatusStore.js.map