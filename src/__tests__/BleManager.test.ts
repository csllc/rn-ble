jest.mock("react-native-ble-manager");
import Ble from '../BleManager';
// import { BleMock, ConfigMock, setMockConfig } from "@csllc/blejs-types";

describe('Initialization', () => {

  it('initialize()s', async () => {

    // it("reports isSupported() correctly", async () => {
    //   let config: ConfigMock = {
    //     isSupported: true,
    //     isAllowed: true,
    //     isEnabled: true,
    //     knownPeripherals: [],
    //     scannedPeripherals: [],

    //     discoverablePeripherals: [],
    //   };
    //   setMockConfig(config);
    //   expect(BleMock.initialize()).resolves.toBe(true);
    //   expect(BleMock.isSupported()).resolves.toBe(true);


    expect(Ble.initialize()).resolves.toBe(true);

  });


});


describe('Finding Peripherals', () => {

  it('scan peripheral', async () => {

    expect(Ble.stopScan()).resolves.toBe(true);
  });

  //await Ble.startScan([SERVICE_ID]);


  //BleManagerDiscoverPeripheral
  //BleManagerStopScan
});

describe('Connection Management', () => {

  it('connect() peripheral', async () => {

  });

  it('disconnect() peripheral', async () => {
    //BleManagerDisconnectPeripheral
  });


})

describe('Characteristics', () => {

  it('find', async () => {

  });

  it('read characteristic', async () => {

    //let val = await Ble.read(connectedPeripheral, characteristics[i].service, characteristics[i].characteristic);


  });


})
