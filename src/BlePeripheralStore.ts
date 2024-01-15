import {BlePeripheral, Logger} from '@csllc/blejs-types';
import BleManager from './BleManager';

var log: Logger = {
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

type Listener = () => void;

export class BlePeripheralState {
  id: string;
  name: string;
  rssi: number;
  connecting: boolean;
  connected: boolean;
  known: boolean;
  p: BlePeripheral;

  constructor(p: BlePeripheral) {
    this.id = p.id;
    this.name = p.name;
    this.rssi = p.rssi;
    this.connecting = false;
    this.connected = false;
    this.known = false;
    this.p = p;
    // this.dongle = new Dongle(Ble);
  }

  destroy() {
    // this.dongle.destroy();
  }
}

let peripherals = new Map<BlePeripheralState['id'], BlePeripheralState>();
let listeners: Listener[] = [];

export const BlePeripheralStore = {
  initialize(options: {logger?: Logger}) {
    log = options?.logger || log;
    log.trace('initialize');
    // Check the OS to see what it has for previously-used

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

  remove(id: string) {
    log.trace('remove', id);
    let bp = peripherals.get(id);
    if (bp) {
      bp.destroy();
      peripherals.delete(id);
      emitChange();
    }
  },

  // addOrUpdate(id: string, p: BlePeripheralState) {
  //   peripherals.set(id, p);
  //   emitChange();
  // },

  subscribe(listener: Listener) {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  getSnapshot() {
    return peripherals;
  },

  async connect(bp: BlePeripheralState) {
    log.info('Connect', bp.id);
    bp.connecting = true;
    emitChange();

    return BleManager.connect(bp.p)
      .catch((err: Error) => {
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

  async disconnect(bp: BlePeripheralState) {
    log.info('Disconnect', bp.id);
    bp.connecting = true;
    emitChange();

    return BleManager.disconnect(bp.p)
      .catch((err: Error) => {
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

function onDiscover(p: BlePeripheral) {
  log.trace('onDiscover');
  peripherals.set(p.id, new BlePeripheralState(p));
  emitChange();
}

function onConnect(id: string) {
  log.trace('onConnect');
  let p = peripherals.get(id);
  if (p) {
    p.connected = true;
    p.connecting = false;
    emitChange();
  }
}

function onDisconnect(id: string) {
  log.trace('onDisconnect');
  let p = peripherals.get(id);
  if (p) {
    p.connected = false;
    p.connecting = false;
    emitChange();
  }
}
