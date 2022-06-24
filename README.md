# cs-mb-ble-rn

NodeJS module that interfaces with Control Solutions LLC Bluetooth dongles, and provides a connection interface for the `@csllc/cs-modbus` or similar module.

This module is based on and presents a similar interface to @csllc/cs-mb-ble, except
that it uses rn-ble-manager as the bluetooth driver for compatibility with the React Native
mobile application framework.

Note: this module is probably not useful unless you are using a Control Solutions
CS1816 type Bluetooth device.

## Usage

See the files in the `examples` directory for working examples of how to use this module.

### Constructor options

- `uuid` - (required) GATT service UUID to use in peripheral scan filter.
- `name` - (optional) Device name to use in peripheral scan filter.

### Watchers

Watchers are characteristics (`statusN`) that are associated with a specific memory location on the connected device, e.g., the motor controller.


### Methods

#### Management

- `startScanning()` - Using the filter parameters supplied to the constructor, start scanning for devices. The returned `Promise` will resolve when the callback passed in the `discover` event is called with a device ID.
- `getAvailability()` - Get the system's BLE availability as a `Promise` that resolves to a `Boolean`
- `isOpen()` - Get the status of the BLE module. Return a truthy value if the peripheral is connected, there's a `BleDevice` instance, and the module has been flagged as ready.

#### Connectivity

- `open()` - Open the peripheral that was requested and found in `startScanning()`
- `close()` - Close the open connection to a peripheral
- `getInfo()` - Get identity information about the connected peripheral as a `Promise` that resolves to an `Object`

#### Communication

- `write()` - Write data to the transparent UART, i.e., to the Modbus interface.

#### Configuration

- `configure()` - Configure the BLE peripheral. Not implemented yet. Returns a `Promise`.
- `keyswitch(state)` - Set the keyswitch state, a boolean. Returns a `Promise` that resolves when the command is complete.
- `watch(slot, id, address, length, cb)` - Sets a watcher using the specified slot, device ID, device memory address, memory read length, and callback function. Returns a `Promise` that resolves when the command is complete.
- `superWatch(id, address, cb)` - Sets the super-watcher using the specified device ID, array of device memory addresses, and callback function. Returns a `Promise` that resolves when the command is complete.
- `unwatch(slot)` - Clears a watcher at the specified slot. The super-watcher's slot may be used.
- `unwatchAll()` - Clears all watchers and super-watcher.
- `getWatchers()` - Returns a `Promise` that resolves to an array of objects, each corresponding to an active watcher.
- `getSuperWatcher()` - Returns a `Promise` that resolves to an array of objects, each corresponding to an active member of the super-watcher.

### Events emitted

Currently, events for watcher updates are not forwarded from the BleDevice instance, since callback functions have been sufficient for use-cases so far. It may make sense to add this in a future version.

#### Originating from @csllc/cs-mb-ble

- `scanStart` - Emitted when device scanning starts
- `scanStop` - Emitted when a device scanning stops because a peripheral was selected
- `discover` - Emitted during scanning as new peripherals are discovered. A callback function to select a peripheral by ID is included in the event data.
- `connecting` - Emitted when the BLE connection to the selected peripheral is attempted.
- `connected` - Emitted when the BLE connection to the selected peripheral is established.
  This is not the same as being ready to use the controller, as it occurs before the peripheral is interrogated and validated.  Use the `ready` event or the resolution of the `open()` promise to determine when the BLE dongle is ready to communicate with the connected controller.
- `ready` - Emitted when the BLE peripheral is ready to communicate with the device it is connected to.
- `disconnecting` - Emitted when disconnecting from the BLE peripheral is requested.
- `disconnected` - Emitted when the BLE connection to the peripheral has finished disconnecting. This object can be deleted afterwards.

### Forwarded from the `BleDevice` instance

- `inspecting` - Peripheral inspection started
- `inspected` - Peripheral inspection complete; information is available via the `getInfo()` method
- `write` - Data written to transparent UART
- `data` - Data received from transparent UART
- `fault` - Connected device fault status changed
- `writeCharacteristic` - Any peripheral characteristic written
- `sendCommand` - Will send command to peripheral
- `watch` - A watcher has been set up
- `superWatch` - The super-watcher has been set up
- `unwatch` - A watcher has been cleared
- `unwatchAll` - All watchers have been cleared

### Forwarded from the `bluetooth` instance

- `availabilitychanged` - Fired when the Bluetooth system as a whole becomes available or unavailable
- `gattserverdisconnected` - Fired when an active BLE connection is lost.

## CS1814 Bluetooth Low Energy description

The CS1814 and CS1816 dongles act as Bluetooth LE peripherals, which exposes one or more of the following services:

### Controller Service

UUID `6765ed1f-4de1-49e1-4771-a14380c90000`

The Controller Service exposes characteristics related to a device, which may be monitored by the central device.  The interpretation of some characteristics is product-specific.

Characteristics:
* Product (UUID `6765ed1f-4de1-49e1-4771-a14380c90003`, (Read)) which contains a string identifying the product type.  This product type is a primary means of determining how the rest of the characteristics and commands are to be interpreted.

* Serial (UUID `6765ed1f-4de1-49e1-4771-a14380c90004`, (Read)) which contains a string identifying the product. 

* Fault (UUID `6765ed1f-4de1-49e1-4771-a14380c90005`, (Read, Notify)).  Contains the device's fault information (interpreted according to the Product's user guide).  The central device may subscribe to this characteristic to receive updates when the fault status changes.

* Status1-n (UUID `6765ed1f-4de1-49e1-4771-a14380c90006` to `6765ed1f-4de1-49e1-4771-a14380c900nn`, (Read, Notify)).  Contains the device's status information (interpreted according to the Product's user guide).  The central device may subscribe to these characteristics to receive updates when status changes.


### Transparent UART Service

UUID `49535343-fe7d-4ae5-8fa9-9fafd205e455`

The Command Service allows the central device to send commands to the peripheral device and receive responses.

Characteristics:
* Transmit (UUID `49535343-1e4d-4bd9-ba61-23c647249616`, (Write)) 

* Receive (UUID `49535343-8841-43f4-a8d4-ecbe34729bb3`, (Notify)) 

To send a command to the device, the Transmit characteristic is written with a header followed by a number of payload bytes.  The header consists of 6 bytes:

Byte 0:	 transactionId (MSB)
Byte 1:  transactionId (LSB)
Byte 2:  protocol (MSB)
Byte 3:  protocol (LSB)
Byte 4:  payload length (MSB)
Byte 5:  payload length (LSB)

The transactionId is assigned by the central device; the peripheral simply includes it in the corresponding response.  This can be used by the central device to match responses to the commands that were sent.

The protocol is 0x0000 for MODBUS type messages.

The payload length is the number of bytes that follow the header.  For MODBUS (protocol 0x0000) messages, the payload must be at least 2 bytes (a unit ID and function code).

The peripheral device accepts payload lengths up to at least 120 bytes.  Payloads longer than the maximum are silently discarded.

The peripheral device will notify the Receive characteristic with a response when the command has been processed.  The response consists of a header (containing the same transactionId and protocol as the request) as well as the payload length and payload bytes.

The maximum delay to process a command varies by the type of peripheral; consult device documentation for expected command processing delays.

The peripheral accepts at least two commands at a time, which are processed in order.  Sending more than two commands without waiting for a response may result in the extra commands being silently ignored by the peripheral.

### Device information service

Certain characteristics may not be readable when this module is incorporated into an Electron app due to a GATT blocklist. Affected characteristics listed in the device files in `lib/device/` are marked as `optional` and any errors relating to them during inspection are ignored.

See the blocklist here: https://github.com/WebBluetoothCG/registries/blob/master/gatt_blocklist.txt


## Development

### Unit Tests

Several unit tests are available for this module. To execute them, run:

`npx mocha`

Not every test will pass for every dongle or configuration. Some known issues are documented in the comments of the `.test.js` files.
