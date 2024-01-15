import BleManager from './BleManager';
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
export class BlePeripheralState {
    constructor(p) {
        this.id = p.id;
        this.name = p.name;
        this.rssi = p.rssi;
        this.connecting = false;
        this.connected = false;
        this.known = false;
        this.p = p;
    }
    destroy() {
    }
}
let peripherals = new Map();
let listeners = [];
export const BlePeripheralStore = {
    initialize(options) {
        log = (options === null || options === void 0 ? void 0 : options.logger) || log;
        log.trace('initialize');
        BleManager.getKnownDevices([]).then(known => {
            known.forEach(p => {
                let state = new BlePeripheralState(p);
                state.known = true;
                peripherals.set(p.id, state);
                console.log('known:', peripherals);
            });
            if (known.length > 0) {
                emitChange();
            }
        });
        BleManager.on('discover', onDiscover);
        BleManager.on('connect', onConnect);
        BleManager.on('disconnect', onDisconnect);
    },
    destroy() {
        log.trace('destroy');
        BleManager.off('discover', onDiscover);
        BleManager.off('connect', onConnect);
        BleManager.off('disconnect', onDisconnect);
    },
    remove(id) {
        log.trace('remove', id);
        let bp = peripherals.get(id);
        if (bp) {
            bp.destroy();
            peripherals.delete(id);
            emitChange();
        }
    },
    subscribe(listener) {
        listeners = [...listeners, listener];
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    },
    getSnapshot() {
        return peripherals;
    },
    async connect(bp) {
        log.info('Connect', bp.id);
        bp.connecting = true;
        emitChange();
        return BleManager.connect(bp.p)
            .catch((err) => {
            log.error('Error connecting: ', err);
        })
            .finally(() => {
            let mybp = peripherals.get(bp.id);
            if (mybp) {
                mybp.connecting = false;
                emitChange();
            }
        });
    },
    async disconnect(bp) {
        log.info('Disconnect', bp.id);
        bp.connecting = true;
        emitChange();
        return BleManager.disconnect(bp.p)
            .catch((err) => {
            log.error('Error disconnecting: ', err);
        })
            .finally(() => {
            let mybp = peripherals.get(bp.id);
            if (mybp) {
                mybp.connecting = false;
                emitChange();
            }
        });
    },
};
function emitChange() {
    peripherals = new Map(peripherals);
    log.trace('emitChange', listeners.length, peripherals);
    for (let listener of listeners) {
        listener();
    }
}
function onDiscover(p) {
    log.trace('onDiscover');
    peripherals.set(p.id, new BlePeripheralState(p));
    emitChange();
}
function onConnect(id) {
    log.trace('onConnect');
    let p = peripherals.get(id);
    if (p) {
        p.connected = true;
        p.connecting = false;
        emitChange();
    }
}
function onDisconnect(id) {
    log.trace('onDisconnect');
    let p = peripherals.get(id);
    if (p) {
        p.connected = false;
        p.connecting = false;
        emitChange();
    }
}
//# sourceMappingURL=BlePeripheralStore.js.map