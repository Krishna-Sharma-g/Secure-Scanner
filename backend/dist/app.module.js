"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bull_1 = require("@nestjs/bull");
const config_1 = require("@nestjs/config");
const health_controller_1 = require("./health.controller");
const scan_entity_1 = require("./entities/scan.entity");
const project_entity_1 = require("./entities/project.entity");
const vulnerability_entity_1 = require("./entities/vulnerability.entity");
const scan_file_entity_1 = require("./entities/scan-file.entity");
const scans_module_1 = require("./scans/scans.module");
const vulnerabilities_module_1 = require("./vulnerabilities/vulnerabilities.module");
const projects_module_1 = require("./projects/projects.module");
const auth_module_1 = require("./auth/auth.module");
const user_entity_1 = require("./entities/user.entity");
const project_member_entity_1 = require("./entities/project-member.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            bull_1.BullModule.forRoot({
                redis: process.env.REDIS_URL || 'redis://localhost:6379',
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                url: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/securescanner',
                entities: [project_entity_1.Project, scan_entity_1.Scan, vulnerability_entity_1.Vulnerability, scan_file_entity_1.ScanFile, user_entity_1.User, project_member_entity_1.ProjectMember],
                synchronize: false,
                logging: false,
            }),
            auth_module_1.AuthModule,
            scans_module_1.ScansModule,
            vulnerabilities_module_1.VulnerabilitiesModule,
            projects_module_1.ProjectsModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
