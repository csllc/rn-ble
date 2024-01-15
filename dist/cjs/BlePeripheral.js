"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlePeripheral = void 0;
class BlePeripheral {
    constructor(p) {
        var _a;
        this._p = p;
        this.address = p.id;
        this.id = p.id;
        this.rssi = p.rssi;
        this.name = p.name || ((_a = p === null || p === void 0 ? void 0 : p.advertising) === null || _a === void 0 ? void 0 : _a.localName) || '';
    }
}
exports.BlePeripheral = BlePeripheral;
//# sourceMappingURL=BlePeripheral.js.map