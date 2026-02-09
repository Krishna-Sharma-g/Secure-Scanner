import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vulnerability } from '../entities/vulnerability.entity';
import { UpdateVulnerabilityStatusDto } from './dto/update-vulnerability-status.dto';

@Injectable()
export class VulnerabilitiesService {
  constructor(
    @InjectRepository(Vulnerability)
    private readonly vulnerabilities: Repository<Vulnerability>,
  ) {}

  async findAll(): Promise<Vulnerability[]> {
    return this.vulnerabilities.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findAllForUser(ownerId: string, projectId?: string): Promise<Vulnerability[]> {
    const qb = this.vulnerabilities
      .createQueryBuilder('v')
      .leftJoin('v.scan', 'scan')
      .leftJoin('scan.project', 'project')
      .leftJoin('project_members', 'pm', 'pm.project_id = project.id')
      .where('pm.user_id = :ownerId', { ownerId })
      .orderBy('v.createdAt', 'DESC')
      .take(200);
    if (projectId) {
      qb.andWhere('project.id = :projectId', { projectId });
    }
    return qb.getMany();
  }

  async findOneForUser(id: string, ownerId: string): Promise<Vulnerability | null> {
    return this.vulnerabilities
      .createQueryBuilder('v')
      .leftJoin('v.scan', 'scan')
      .leftJoin('scan.project', 'project')
      .leftJoin('project_members', 'pm', 'pm.project_id = project.id')
      .where('v.id = :id', { id })
      .andWhere('pm.user_id = :ownerId', { ownerId })
      .getOne();
  }

  async updateStatusForUser(id: string, dto: UpdateVulnerabilityStatusDto, ownerId: string) {
    const vuln = await this.findOneForUser(id, ownerId);
    if (!vuln) {
      return null;
    }
    vuln.status = dto.status;
    vuln.remediationNotes = dto.notes ?? vuln.remediationNotes;
    if (dto.status === 'resolved') {
      vuln.resolvedAt = new Date();
    }
    return this.vulnerabilities.save(vuln);
  }
}
