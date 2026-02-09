"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScansModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bull_1 = require("@nestjs/bull");
const scan_entity_1 = require("../entities/scan.entity");
const scan_file_entity_1 = require("../entities/scan-file.entity");
const vulnerability_entity_1 = require("../entities/vulnerability.entity");
const project_entity_1 = require("../entities/project.entity");
const scans_controller_1 = require("./scans.controller");
const scans_service_1 = require("./scans.service");
const scan_events_gateway_1 = require("./scan-events.gateway");
const scan_events_service_1 = require("./scan-events.service");
const scan_events_processor_1 = require("./scan-events.processor");
let ScansModule = class ScansModule {
};
exports.ScansModule = ScansModule;
exports.ScansModule = ScansModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([scan_entity_1.Scan, scan_file_entity_1.ScanFile, vulnerability_entity_1.Vulnerability, project_entity_1.Project]),
            bull_1.BullModule.registerQueue({ name: 'scan-events' }),
        ],
        controllers: [scans_controller_1.ScansController],
        providers: [scans_service_1.ScansService, scan_events_gateway_1.ScanEventsGateway, scan_events_service_1.ScanEventsService, scan_events_processor_1.ScanEventsProcessor],
    })
], ScansModule);
