"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock("react-native-ble-manager");
const BleManager_1 = __importDefault(require("../BleManager"));
describe('Initialization', () => {
    it('initialize()s', async () => {
        expect(BleManager_1.default.initialize()).resolves.toBe(true);
    });
});
describe('Finding Peripherals', () => {
    it('scan peripheral', async () => {
        expect(BleManager_1.default.stopScan()).resolves.toBe(true);
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