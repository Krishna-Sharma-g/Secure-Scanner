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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanEventsService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const scan_events_gateway_1 = require("./scan-events.gateway");
let ScanEventsService = class ScanEventsService {
    constructor(queue, gateway) {
        this.queue = queue;
        this.gateway = gateway;
    }
    async emitProgress(payload) {
        await this.enqueueOrEmit('progress', payload, () => this.gateway.emitProgress(payload));
    }
    async emitVulnerability(payload) {
        await this.enqueueOrEmit('vulnerability', payload, () => this.gateway.emitVulnerability(payload));
    }
    async emitComplete(payload) {
        await this.enqueueOrEmit('complete', payload, () => this.gateway.emitComplete(payload));
    }
    async enqueueOrEmit(name, payload, fallback) {
        try {
            await this.queue.add(name, payload, { attempts: 2, removeOnComplete: true });
        }
        catch {
            fallback();
        }
    }
};
exports.ScanEventsService = ScanEventsService;
exports.ScanEventsService = ScanEventsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bull_1.InjectQueue)('scan-events')),
    __metadata("design:paramtypes", [Object, scan_events_gateway_1.ScanEventsGateway])
], ScanEventsService);
