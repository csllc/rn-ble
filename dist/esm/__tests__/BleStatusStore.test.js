import { useSyncExternalStore } from 'react';
import { BleStatusStore } from '../BleStatusStore';
jest.setTimeout(15000);
it('renders correctly', () => {
    const bleStatus = useSyncExternalStore(BleStatusStore.subscribe, BleStatusStore.getSnapshot);
    expect(bleStatus.isScanning).toBe(false);
});
//# sourceMappingURL=BleStatusStore.test.js.map