"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectMembers1700000000001 = void 0;
class ProjectMembers1700000000001 {
    constructor() {
        this.name = 'ProjectMembers1700000000001';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TYPE "project_role_enum" AS ENUM ('owner', 'admin', 'member', 'viewer')`);
        await queryRunner.query(`
      CREATE TABLE "project_members" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "project_role_enum" NOT NULL DEFAULT 'member',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_project_members_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_project_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`CREATE INDEX "idx_project_members_project" ON "project_members" ("project_id")`);
        await queryRunner.query(`CREATE INDEX "idx_project_members_user" ON "project_members" ("user_id")`);
        await queryRunner.query(`ALTER TABLE "scans" ADD COLUMN "created_by" uuid`);
        await queryRunner.query(`ALTER TABLE "scans" ADD CONSTRAINT "fk_scans_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "scans" DROP CONSTRAINT "fk_scans_created_by"`);
        await queryRunner.query(`ALTER TABLE "scans" DROP COLUMN "created_by"`);
        await queryRunner.query(`DROP TABLE "project_members"`);
        await queryRunner.query(`DROP TYPE "project_role_enum"`);
    }
}
exports.ProjectMembers1700000000001 = ProjectMembers1700000000001;
