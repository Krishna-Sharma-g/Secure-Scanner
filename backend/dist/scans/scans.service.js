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
exports.ScansService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const scan_entity_1 = require("../entities/scan.entity");
const scan_file_entity_1 = require("../entities/scan-file.entity");
const vulnerability_entity_1 = require("../entities/vulnerability.entity");
const scan_events_service_1 = require("./scan-events.service");
const project_entity_1 = require("../entities/project.entity");
let ScansService = class ScansService {
    constructor(scans, scanFiles, vulnerabilities, projects, events) {
        this.scans = scans;
        this.scanFiles = scanFiles;
        this.vulnerabilities = vulnerabilities;
        this.projects = projects;
        this.events = events;
    }
    async create(dto, ownerId) {
        const project = await this.projects.findOne({ where: { id: dto.project_id, ownerId } });
        if (!project) {
            throw new common_1.NotFoundException('Project not found');
        }
        const scan = this.scans.create({
            project,
            status: 'pending',
            scanConfig: dto.scan_config ?? {},
            startedAt: new Date(),
        });
        return this.scans.save(scan);
    }
    async findAll(ownerId) {
        return this.scans
            .createQueryBuilder('scan')
            .leftJoin('scan.project', 'project')
            .where('project.owner_id = :ownerId', { ownerId })
            .orderBy('scan.created_at', 'DESC')
            .take(50)
            .getMany();
    }
    async findOne(id, ownerId) {
        return this.scans
            .createQueryBuilder('scan')
            .leftJoinAndSelect('scan.vulnerabilities', 'vulnerability')
            .leftJoin('scan.project', 'project')
            .where('scan.id = :id', { id })
            .andWhere('project.owner_id = :ownerId', { ownerId })
            .getOne();
    }
    async update(id, dto, ownerId) {
        const scan = await this.scans
            .createQueryBuilder('scan')
            .leftJoin('scan.project', 'project')
            .where('scan.id = :id', { id })
            .andWhere('project.owner_id = :ownerId', { ownerId })
            .getOne();
        if (!scan) {
            return null;
        }
        if (dto.status)
            scan.status = dto.status;
        if (typeof dto.total_files === 'number')
            scan.totalFiles = dto.total_files;
        if (typeof dto.files_processed === 'number')
            scan.filesProcessed = dto.files_processed;
        if (typeof dto.duration_seconds === 'number')
            scan.durationSeconds = dto.duration_seconds;
        if (dto.status === 'completed')
            scan.completedAt = new Date();
        const saved = await this.scans.save(scan);
        if (dto.status === 'completed') {
            await this.events.emitComplete({ scan_id: id, summary: { total_files: saved.totalFiles } });
        }
        return saved;
    }
    async addFiles(scanId, files, ownerId) {
        if (!files || files.length === 0) {
            return [];
        }
        const scan = await this.scans
            .createQueryBuilder('scan')
            .leftJoin('scan.project', 'project')
            .where('scan.id = :id', { id: scanId })
            .andWhere('project.owner_id = :ownerId', { ownerId })
            .getOne();
        if (!scan) {
            throw new common_1.NotFoundException('Scan not found');
        }
        const entities = files.map((file) => this.scanFiles.create({
            scanId,
            filePath: file.file_path,
            language: file.language,
            linesOfCode: file.lines_of_code,
            vulnerabilityCount: file.vulnerability_count ?? 0,
        }));
        const saved = await this.scanFiles.save(entities);
        await this.events.emitProgress({
            scan_id: scanId,
            files_processed: saved.length,
            total_files: saved.length,
        });
        return saved;
    }
    async addVulnerabilities(scanId, vulns, ownerId) {
        if (!vulns || vulns.length === 0) {
            return [];
        }
        const scan = await this.scans
            .createQueryBuilder('scan')
            .leftJoin('scan.project', 'project')
            .where('scan.id = :id', { id: scanId })
            .andWhere('project.owner_id = :ownerId', { ownerId })
            .getOne();
        if (!scan) {
            throw new common_1.NotFoundException('Scan not found');
        }
        const entities = vulns.map((v) => this.vulnerabilities.create({
            scanId,
            type: v.type,
            severity: v.severity,
            filePath: v.file_path,
            lineNumber: v.line_number,
            columnNumber: v.column_number,
            codeSnippet: v.code_snippet,
            message: v.message,
            cweId: v.cwe_id,
            status: v.status ?? 'open',
        }));
        const saved = await this.vulnerabilities.save(entities);
        for (const vuln of saved) {
            await this.events.emitVulnerability({ scan_id: scanId, vulnerability: vuln });
        }
        return saved;
    }
    async createTestScan(dto, ownerId) {
        const project = await this.projects.save(this.projects.create({ name: `test-project-${Date.now()}`, owner: { id: ownerId } }));
        const totalFiles = dto.files ?? 10;
        const scan = await this.scans.save(this.scans.create({
            project,
            status: 'running',
            startedAt: new Date(),
            totalFiles,
            filesProcessed: 0,
            scanConfig: { test: true },
        }));
        await this.events.emitProgress({
            scan_id: scan.id,
            files_processed: 0,
            total_files: totalFiles,
        });
        const files = [];
        for (let i = 0; i < totalFiles; i++) {
            files.push(this.scanFiles.create({
                scanId: scan.id,
                filePath: `src/test-file-${i + 1}.js`,
                language: 'javascript',
                linesOfCode: 50,
                vulnerabilityCount: 0,
            }));
        }
        await this.scanFiles.save(files);
        await this.events.emitProgress({
            scan_id: scan.id,
            files_processed: totalFiles,
            total_files: totalFiles,
        });
        const vulnCount = dto.vulnerabilities ?? 3;
        const vulns = [];
        for (let i = 0; i < vulnCount; i++) {
            vulns.push(this.vulnerabilities.create({
                scanId: scan.id,
                type: 'hardcoded_secret',
                severity: 'critical',
                filePath: `src/test-file-${i + 1}.js`,
                lineNumber: 10 + i,
                message: 'Hardcoded secret detected',
                status: 'open',
            }));
        }
        const savedVulns = await this.vulnerabilities.save(vulns);
        for (const vuln of savedVulns) {
            await this.events.emitVulnerability({ scan_id: scan.id, vulnerability: vuln });
        }
        scan.status = 'completed';
        scan.completedAt = new Date();
        scan.filesProcessed = totalFiles;
        await this.scans.save(scan);
        await this.events.emitComplete({ scan_id: scan.id, summary: { total_files: totalFiles } });
        return scan;
    }
};
exports.ScansService = ScansService;
exports.ScansService = ScansService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(scan_entity_1.Scan)),
    __param(1, (0, typeorm_1.InjectRepository)(scan_file_entity_1.ScanFile)),
    __param(2, (0, typeorm_1.InjectRepository)(vulnerability_entity_1.Vulnerability)),
    __param(3, (0, typeorm_1.InjectRepository)(project_entity_1.Project)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        scan_events_service_1.ScanEventsService])
], ScansService);
