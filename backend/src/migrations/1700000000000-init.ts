import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM ('admin', 'developer', 'viewer')`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255) NOT NULL UNIQUE,
        "name" varchar(255) NOT NULL,
        "password_hash" varchar NOT NULL,
        "role" "user_role_enum" NOT NULL DEFAULT 'developer',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "repository_url" varchar(500),
        "description" text,
        "config" jsonb,
        "owner_id" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_projects_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_projects_name" ON "projects" ("name")`);

    await queryRunner.query(`
      CREATE TABLE "scans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" uuid,
        "status" varchar(50) NOT NULL,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "duration_seconds" int,
        "total_files" int NOT NULL DEFAULT 0,
        "files_processed" int NOT NULL DEFAULT 0,
        "scan_config" jsonb,
        "error_message" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_scans_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_scans_project_id" ON "scans" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "idx_scans_status" ON "scans" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_scans_started_at" ON "scans" ("started_at" DESC)`);

    await queryRunner.query(`
      CREATE TABLE "vulnerabilities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "scan_id" uuid NOT NULL,
        "type" varchar(100) NOT NULL,
        "severity" varchar(20) NOT NULL,
        "file_path" varchar(1000) NOT NULL,
        "line_number" int NOT NULL,
        "column_number" int,
        "code_snippet" text,
        "message" text NOT NULL,
        "cwe_id" varchar(20),
        "owasp_category" varchar(100),
        "status" varchar(50) NOT NULL DEFAULT 'open',
        "remediation_notes" text,
        "resolved_at" timestamptz,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_vulnerabilities_scan" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_vulnerabilities_scan_id" ON "vulnerabilities" ("scan_id")`);
    await queryRunner.query(`CREATE INDEX "idx_vulnerabilities_severity" ON "vulnerabilities" ("severity")`);
    await queryRunner.query(`CREATE INDEX "idx_vulnerabilities_type" ON "vulnerabilities" ("type")`);
    await queryRunner.query(`CREATE INDEX "idx_vulnerabilities_status" ON "vulnerabilities" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_vulnerabilities_created_at" ON "vulnerabilities" ("created_at" DESC)`);

    await queryRunner.query(`
      CREATE TABLE "scan_files" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "scan_id" uuid NOT NULL,
        "file_path" varchar(1000) NOT NULL,
        "language" varchar(50),
        "lines_of_code" int,
        "vulnerability_count" int NOT NULL DEFAULT 0,
        "processed_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "fk_scan_files_scan" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_scan_files_scan_id" ON "scan_files" ("scan_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "scan_files"`);
    await queryRunner.query(`DROP TABLE "vulnerabilities"`);
    await queryRunner.query(`DROP TABLE "scans"`);
    await queryRunner.query(`DROP INDEX "idx_projects_name"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
