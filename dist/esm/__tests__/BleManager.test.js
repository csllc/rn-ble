jest.mock("react-native-ble-manager");
import Ble from '../BleManager';
describe('Initialization', () => {
    it('initialize()s', async () => {
        expect(Ble.initialize()).resolves.toBe(true);
    });
});
describe('Finding Peripherals', () => {
    it('scan peripheral', async () => {
        expect(Ble.stopScan()).resolves.toBe(true);
    });
});
describe('Connection Management', () => {
    it('connect() peripheral', async () => {
    });
    it('disconnect() peripheral', async () => {
    });
});
describe('Characteristics', () => {
    it('find', async () => {
    });
    it('read characteristic', async () => {
    });
});
//# sourceMappingURL=BleManager.test.js.map