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
exports.Scan = void 0;
const typeorm_1 = require("typeorm");
const project_entity_1 = require("./project.entity");
const vulnerability_entity_1 = require("./vulnerability.entity");
const scan_file_entity_1 = require("./scan-file.entity");
const user_entity_1 = require("./user.entity");
let Scan = class Scan {
};
exports.Scan = Scan;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Scan.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => project_entity_1.Project, (project) => project.scans, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'project_id' }),
    __metadata("design:type", project_entity_1.Project)
], Scan.prototype, "project", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], Scan.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Scan.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], Scan.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'started_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Scan.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Scan.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'duration_seconds', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Scan.prototype, "durationSeconds", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_files', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Scan.prototype, "totalFiles", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'files_processed', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Scan.prototype, "filesProcessed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scan_config', type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Scan.prototype, "scanConfig", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], Scan.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => vulnerability_entity_1.Vulnerability, (vuln) => vuln.scan),
    __metadata("design:type", Array)
], Scan.prototype, "vulnerabilities", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => scan_file_entity_1.ScanFile, (file) => file.scan),
    __metadata("design:type", Array)
], Scan.prototype, "files", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Scan.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Scan.prototype, "updatedAt", void 0);
exports.Scan = Scan = __decorate([
    (0, typeorm_1.Entity)('scans')
], Scan);
