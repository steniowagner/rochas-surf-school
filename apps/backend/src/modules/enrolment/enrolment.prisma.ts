import { Injectable } from '@nestjs/common';
import {
  Enrolment,
  EnrolmentRepository,
  ExpirableEnrolment,
  OPEN_ENROLMENT_STATUSES,
} from '@rochas-surf-school/enrolment';
import { ConflictError } from '@rochas-surf-school/shared';
import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Enrolment as EnrolmentRecord } from '../../generated/prisma/client.js';

const UNIQUE_VIOLATION = 'P2002';
const OPEN = [...OPEN_ENROLMENT_STATUSES] as ('pending' | 'approved')[];

@Injectable()
export class PrismaEnrolmentRepository implements EnrolmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(enrolment: Enrolment): Promise<Enrolment> {
    try {
      const record = await this.prisma.enrolment.create({
        data: {
          id: enrolment.id,
          classId: enrolment.classId,
          studentId: enrolment.studentId,
          status: enrolment.status,
          requestedAt: enrolment.requestedAt,
          ruleAcceptedAt: enrolment.ruleAcceptedAt,
          decidedAt: enrolment.decidedAt,
          reason: enrolment.reason,
          endedAt: enrolment.endedAt,
          createdAt: enrolment.createdAt,
        },
      });

      return this.toDomain(record);
    } catch (error) {
      // The partial unique index: of two simultaneous requests by the same student exactly one is stored.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError('enrolment.alreadyOpen');
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Enrolment | null> {
    const record = await this.prisma.enrolment.findUnique({ where: { id } });

    return record ? this.toDomain(record) : null;
  }

  async withdraw(id: string, now: Date): Promise<boolean> {
    return this.endPending(id, 'withdrawn', now);
  }

  async findExpirable(now: Date): Promise<ExpirableEnrolment[]> {
    const records = await this.prisma.enrolment.findMany({
      where: {
        status: 'pending',
        schoolClass: { startsAt: { lte: now }, cancelledAt: null },
      },
      include: { schoolClass: { select: { discipline: true, startsAt: true } } },
      orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
    });

    return records.map(({ schoolClass, ...record }) => ({
      enrolment: this.toDomain(record),
      discipline: schoolClass.discipline,
      startsAt: schoolClass.startsAt,
    }));
  }

  async expire(id: string, now: Date): Promise<boolean> {
    return this.endPending(id, 'expired', now);
  }

  async closeOpenForClass(classId: string, now: Date): Promise<Enrolment[]> {
    // One write that returns the rows it changed: an enrolment ended meanwhile is neither changed nor returned.
    const records = await this.prisma.enrolment.updateManyAndReturn({
      where: { classId, status: { in: OPEN } },
      data: { status: 'classCancelled', endedAt: now, updatedAt: now },
    });

    return records
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime() || a.id.localeCompare(b.id))
      .map((record) => this.toDomain(record));
  }

  /** The check sits on the write itself, so a race leaves exactly one winner. */
  private async endPending(id: string, status: 'withdrawn' | 'expired', now: Date): Promise<boolean> {
    const { count } = await this.prisma.enrolment.updateMany({
      where: { id, status: 'pending' },
      data: { status, endedAt: now, updatedAt: now },
    });

    return count === 1;
  }

  private toDomain(record: EnrolmentRecord): Enrolment {
    return new Enrolment({
      id: record.id,
      classId: record.classId,
      studentId: record.studentId,
      status: record.status,
      requestedAt: record.requestedAt,
      ruleAcceptedAt: record.ruleAcceptedAt,
      decidedAt: record.decidedAt,
      reason: record.reason,
      endedAt: record.endedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
