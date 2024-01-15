/**
 * Stores the current state (enable, scanning, etc) of the Bluetooth hardware interface
 *
 * Presents a subscriber interface so callers can be notified of state changes.  This
 * is compatible for instance with React useSyncExternalStore
 */
import BleManager from '@csllc/rn-mb-ble/src/BleManager';
import {Logger} from '@csllc/blejs-types';

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

export interface BleState {
  /**
   * Initially true, until we have figured out the rest of the state variables (completed the
   * initialize() function)
   *
   * You might want to use this to show a loading spinner, or wait for loading=false before
   * interpreting any other state
   */
  isReady?: boolean;

  /**
   * Whether BLE is available on this platform (eg hardware exists)
   */
  isAvailable?: boolean;

  /**
   * Whether we have necessary authorization to use the hardware (eg user has agreed we can use BLE)
   */
  isAuthorized?: boolean;

  /**
   * Whether Bluetooth is 'turned on' or not
   */
  isEnabled?: boolean;

  /**
   * whether the hardware is performing a scan for peripherals
   */
  isScanning?: boolean;
}

const INIT_STATE = {
  isReady: false,
  isAvailable: false,
  isAuthorized: false,
  isEnabled: false,
  isScanning: false,
};

let state: BleState = {...INIT_STATE};

// all our subscriber callbacks
let listeners: Listener[] = [];

export const BleStatusStore = {
  // Call once after Bluetooth driver is started.  Figures out the initial state
  initialize(options: {logger?: Logger}) {
    log = options?.logger || log;
    log.trace('initialize');

    BleManager.on('scanning', onScanning);
    BleManager.on('enable', onEnable);

    async function init() {
      state = {...INIT_STATE};
      let isAvailable = await BleManager.isSupported();

      let isAuthorized = isAvailable;

      emitChange({isAvailable, isAuthorized});
    }
    init()
      .then(() => {
        emitChange({isReady: true});
      })
      .catch(err => log.error('Init failed', err));
  },

  // Clean up when shutting down
  destroy() {
    log.trace('destroy');

    BleManager.off('enable', onEnable);
    BleManager.off('scanning', onScanning);
  },

  // ask the operating system to turn on Bluetooth (if supported)
  async enable() {
    return BleManager.enable();
  },

  // check state.  Sometimes the operating system does not notify us of state changes
  // example: Android user turns off bluetooth while app is backgrounded.  You can
  // use this to manually verify the state (like when the app returns to the foreground)
  async checkState() {
    return BleManager.checkState();
  },

  async startScan(services: string[], duration: number) {
    log.info('StartScan', duration);
    // start scanning, and continually update (to show current rssi value)
    await BleManager.startScan(services, null, {duration, duplicates: true});
  },

  async stopScan() {
    log.info('StopScan');
    await BleManager.stopScan();
  },

  // provide a callback for state changes
  subscribe(listener: Listener) {
    listeners = [...listeners, listener];
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  // Return the current state
  getSnapshot() {
    return state;
  },
};

// Notify all our listeners that something has changed
function emitChange(update: BleState) {
  state = {...state, ...update};
  log.trace('emitChange', JSON.stringify(update));

  for (let listener of listeners) {
    listener();
  }
}

// Event handler - scanning state changed
function onScanning(isScanning: boolean) {
  if (state.isScanning !== isScanning) {
    emitChange({isScanning});
  }
}

// Event handler - BLE driver state changed
function onEnable(isEnabled: boolean) {
  if (state.isEnabled !== isEnabled) {
    emitChange({isEnabled});
  }
}
