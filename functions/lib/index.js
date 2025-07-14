"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleGenerate = void 0;
const https_1 = require("firebase-functions/v2/https");
const simple_flow_1 = require("./simple-flow");
exports.simpleGenerate = (0, https_1.onRequest)({ cors: true }, simple_flow_1.emergencyFlow);
