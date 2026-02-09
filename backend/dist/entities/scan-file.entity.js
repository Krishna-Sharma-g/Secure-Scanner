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
exports.ScanFile = void 0;
const typeorm_1 = require("typeorm");
const scan_entity_1 = require("./scan.entity");
let ScanFile = class ScanFile {
};
exports.ScanFile = ScanFile;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ScanFile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => scan_entity_1.Scan, (scan) => scan.files, { onDelete: 'CASCADE' }),
    __metadata("design:type", scan_entity_1.Scan)
], ScanFile.prototype, "scan", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'scan_id', type: 'uuid' }),
    __metadata("design:type", String)
], ScanFile.prototype, "scanId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'file_path', length: 1000 }),
    __metadata("design:type", String)
], ScanFile.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], ScanFile.prototype, "language", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'lines_of_code', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], ScanFile.prototype, "linesOfCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'vulnerability_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ScanFile.prototype, "vulnerabilityCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'processed_at' }),
    __metadata("design:type", Date)
], ScanFile.prototype, "processedAt", void 0);
exports.ScanFile = ScanFile = __decorate([
    (0, typeorm_1.Entity)('scan_files')
], ScanFile);
