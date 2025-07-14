"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleGenerate = void 0;
const firebase_1 = require("@genkit-ai/firebase");
const simple_flow_1 = require("./simple-flow");
exports.simpleGenerate = (0, firebase_1.onCallGenkit)({}, simple_flow_1.emergencyFlow);
