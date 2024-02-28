"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const BleStatusStore_1 = require("../BleStatusStore");
jest.setTimeout(15000);
it('renders correctly', () => {
    const bleStatus = (0, react_1.useSyncExternalStore)(BleStatusStore_1.BleStatusStore.subscribe, BleStatusStore_1.BleStatusStore.getSnapshot);
    expect(bleStatus.isScanning).toBe(false);
});
//# sourceMappingURL=BleStatusStore.test.js.map