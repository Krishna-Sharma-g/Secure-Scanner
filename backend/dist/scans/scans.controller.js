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
exports.ScansController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const create_scan_dto_1 = require("./dto/create-scan.dto");
const update_scan_dto_1 = require("./dto/update-scan.dto");
const create_test_scan_dto_1 = require("./dto/create-test-scan.dto");
const scans_service_1 = require("./scans.service");
let ScansController = class ScansController {
    constructor(scansService) {
        this.scansService = scansService;
    }
    create(dto, req) {
        return this.scansService.create(dto, req.user.id);
    }
    findAll(req, projectId) {
        return this.scansService.findAll(req.user.id, projectId);
    }
    findOne(id, req) {
        return this.scansService.findOne(id, req.user.id);
    }
    update(id, dto, req) {
        return this.scansService.update(id, dto, req.user.id);
    }
    addFiles(id, files, req) {
        return this.scansService.addFiles(id, files, req.user.id);
    }
    addVulnerabilities(id, vulns, req) {
        return this.scansService.addVulnerabilities(id, vulns, req.user.id);
    }
    createTest(dto, req) {
        return this.scansService.createTestScan(dto, req.user.id);
    }
};
exports.ScansController = ScansController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_scan_dto_1.CreateScanDto, Object]),
    __metadata("design:returntype", void 0)
], ScansController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('project_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ScansController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ScansController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_scan_dto_1.UpdateScanDto, Object]),
    __metadata("design:returntype", void 0)
], ScansController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/files'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", void 0)
], ScansController.prototype, "addFiles", null);
__decorate([
    (0, common_1.Post)(':id/vulnerabilities'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", void 0)
], ScansController.prototype, "addVulnerabilities", null);
__decorate([
    (0, common_1.Post)('test'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_test_scan_dto_1.CreateTestScanDto, Object]),
    __metadata("design:returntype", void 0)
], ScansController.prototype, "createTest", null);
exports.ScansController = ScansController = __decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)('api/scans'),
    __metadata("design:paramtypes", [scans_service_1.ScansService])
], ScansController);
