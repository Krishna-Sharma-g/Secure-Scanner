"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const project_entity_1 = require("./entities/project.entity");
const scan_entity_1 = require("./entities/scan.entity");
const vulnerability_entity_1 = require("./entities/vulnerability.entity");
const scan_file_entity_1 = require("./entities/scan-file.entity");
const user_entity_1 = require("./entities/user.entity");
const project_member_entity_1 = require("./entities/project-member.entity");
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://admin:password@localhost:5432/securescanner',
    entities: [project_entity_1.Project, scan_entity_1.Scan, vulnerability_entity_1.Vulnerability, scan_file_entity_1.ScanFile, user_entity_1.User, project_member_entity_1.ProjectMember],
    migrations: ['dist/migrations/*.js'],
    synchronize: false,
});
