"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleGenerate = void 0;
const https_1 = require("firebase-functions/v2/https");
const common_1 = require("./common");
const simple_flow_1 = require("./simple-flow");
// Note: This switches from an onCall to an onRequest trigger.
// The frontend must use a standard fetch/axios call to this HTTP endpoint, not httpsCallable.
exports.simpleGenerate = (0, https_1.onRequest)({ cors: true }, common_1.ai.flow(simple_flow_1.emergencyFlow));
