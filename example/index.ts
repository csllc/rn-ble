/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { BleManager, BlePeripheralStore, BleStatusStore } from '@csllc/rn-mb-ble';
import { loggerScope } from './src/lib/Logger';


// initialize the bluetooth interface outside the flow of react screen rendering
async function initBle() {
  await BleManager.initialize({
    rnbm: { showAlert: true },
    logger: loggerScope('BleManager'),
  });

  BleStatusStore.initialize({
    logger: loggerScope('BleStatusStore'),
  });

  BlePeripheralStore.initialize({
    logger: loggerScope('BlePeripheralStore'),
  });
}

initBle().catch(err => console.log('Error initializing ble', err));

AppRegistry.registerComponent(appName, () => App);
