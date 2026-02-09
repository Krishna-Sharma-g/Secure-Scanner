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

  async findAllForUser(ownerId: string): Promise<Vulnerability[]> {
    return this.vulnerabilities
      .createQueryBuilder('v')
      .leftJoin('v.scan', 'scan')
      .leftJoin('scan.project', 'project')
      .where('project.owner_id = :ownerId', { ownerId })
      .orderBy('v.created_at', 'DESC')
      .take(200)
      .getMany();
  }

  async findOneForUser(id: string, ownerId: string): Promise<Vulnerability | null> {
    return this.vulnerabilities
      .createQueryBuilder('v')
      .leftJoin('v.scan', 'scan')
      .leftJoin('scan.project', 'project')
      .where('v.id = :id', { id })
      .andWhere('project.owner_id = :ownerId', { ownerId })
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
