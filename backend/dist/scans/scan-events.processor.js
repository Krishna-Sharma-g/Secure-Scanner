"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanEventsProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const scan_events_gateway_1 = require("./scan-events.gateway");
let ScanEventsProcessor = class ScanEventsProcessor {
    constructor(gateway) {
        this.gateway = gateway;
    }
    handleProgress(job) {
        this.gateway.emitProgress(job.data);
    }
    handleVulnerability(job) {
        this.gateway.emitVulnerability(job.data);
    }
    handleComplete(job) {
        this.gateway.emitComplete(job.data);
    }
};
exports.ScanEventsProcessor = ScanEventsProcessor;
__decorate([
    (0, bull_1.Process)('progress'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ScanEventsProcessor.prototype, "handleProgress", null);
__decorate([
    (0, bull_1.Process)('vulnerability'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ScanEventsProcessor.prototype, "handleVulnerability", null);
__decorate([
    (0, bull_1.Process)('complete'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ScanEventsProcessor.prototype, "handleComplete", null);
exports.ScanEventsProcessor = ScanEventsProcessor = __decorate([
    (0, bull_1.Processor)('scan-events'),
    __metadata("design:paramtypes", [scan_events_gateway_1.ScanEventsGateway])
], ScanEventsProcessor);
