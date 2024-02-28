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
let manager;
let listeners = [];
export const BleStatusStore = {
    initialize(ble, options) {
        log = (options === null || options === void 0 ? void 0 : options.logger) || log;
        log.trace('initialize');
        manager = ble;
        manager.on('scanning', onScanning);
        manager.on('enable', onEnable);
        async function init() {
            state = { ...INIT_STATE };
            let isAvailable = await manager.isSupported();
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
        manager.off('enable', onEnable);
        manager.off('scanning', onScanning);
    },
    async enable() {
        return manager.enable();
    },
    async checkState() {
        return manager.checkState();
    },
    async startScan(services, duration) {
        log.info('StartScan', duration);
        await manager.startScan(services, null, { duration, duplicates: true });
    },
    async stopScan() {
        log.info('StopScan');
        await manager.stopScan();
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