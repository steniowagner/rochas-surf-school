import { Injectable } from '@nestjs/common';
import {
  ApproveResult,
  DirectEnrolResult,
  Enrolment,
  EnrolmentRepository,
  ExpirableEnrolment,
  OPEN_ENROLMENT_STATUSES,
  PendingRequestsClass,
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

  async findPendingByClass(now: Date): Promise<PendingRequestsClass[]> {
    const classes = await this.prisma.schoolClass.findMany({
      where: { startsAt: { gt: now }, cancelledAt: null, enrolments: { some: { status: 'pending' } } },
      select: {
        id: true,
        discipline: true,
        level: true,
        startsAt: true,
        endsAt: true,
        capacity: true,
        location: { select: { name: true } },
        enrolments: {
          where: { status: 'pending' },
          orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            requestedAt: true,
            student: { select: { id: true, name: true, photoUrl: true } },
          },
        },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });

    if (classes.length === 0) {
      return [];
    }

    const taken = await this.prisma.enrolment.groupBy({
      by: ['classId'],
      where: { classId: { in: classes.map((item) => item.id) }, status: 'approved' },
      _count: { _all: true },
    });
    const seatsTaken = new Map(taken.map((item) => [item.classId, item._count._all]));

    return classes.map(({ enrolments, ...item }) => ({
      ...item,
      seatsTaken: seatsTaken.get(item.id) ?? 0,
      requests: enrolments,
    }));
  }

  async approve(id: string, now: Date): Promise<ApproveResult> {
    return this.prisma.$transaction(async (tx) => {
      const stored = await tx.enrolment.findUnique({
        where: { id },
        select: { classId: true, status: true },
      });

      if (!stored || stored.status !== 'pending') {
        return 'notPending';
      }

      // The class row is the lock every seat change takes, so two approvals for the last seat run one after the other.
      const [locked] = await tx.$queryRaw<{ capacity: number }[]>(
        Prisma.sql`SELECT capacity FROM classes WHERE id = ${stored.classId}::uuid FOR UPDATE`,
      );

      if (!locked) {
        return 'notPending';
      }

      const taken = await tx.enrolment.count({
        where: { classId: stored.classId, status: 'approved' },
      });

      if (taken >= locked.capacity) {
        return 'full';
      }

      const { count } = await tx.enrolment.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'approved', decidedAt: now, updatedAt: now },
      });

      return count === 1 ? 'approved' : 'notPending';
    });
  }

  async enrolDirectly(enrolment: Enrolment, now: Date): Promise<DirectEnrolResult> {
    try {
      return await this.prisma.$transaction(async (tx): Promise<DirectEnrolResult> => {
        // The class row is the lock every seat change takes, so this write and an approval run one after the other.
        const [locked] = await tx.$queryRaw<{ capacity: number }[]>(
          Prisma.sql`SELECT capacity FROM classes WHERE id = ${enrolment.classId}::uuid FOR UPDATE`,
        );

        if (!locked) {
          return { result: 'full' };
        }

        const open = await tx.enrolment.findFirst({
          where: { classId: enrolment.classId, studentId: enrolment.studentId, status: { in: OPEN } },
        });

        if (open?.status === 'approved') {
          return { result: 'alreadyApproved' };
        }

        const taken = await tx.enrolment.count({
          where: { classId: enrolment.classId, status: 'approved' },
        });

        if (taken >= locked.capacity) {
          return { result: 'full' };
        }

        if (open) {
          const approved = await tx.enrolment.update({
            where: { id: open.id },
            data: { status: 'approved', decidedAt: now, updatedAt: now },
          });

          return { result: 'approved', enrolment: this.toDomain(approved) };
        }

        const created = await tx.enrolment.create({
          data: {
            id: enrolment.id,
            classId: enrolment.classId,
            studentId: enrolment.studentId,
            status: 'approved',
            requestedAt: enrolment.requestedAt,
            ruleAcceptedAt: enrolment.ruleAcceptedAt,
            decidedAt: enrolment.decidedAt,
            createdAt: enrolment.createdAt,
          },
        });

        return { result: 'enrolled', enrolment: this.toDomain(created) };
      });
    } catch (error) {
      // The partial unique index: the student asked for the same class between the read and the insert.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError('enrolment.alreadyOpen');
      }

      throw error;
    }
  }

  async deny(id: string, reason: string | null, now: Date): Promise<boolean> {
    const { count } = await this.prisma.enrolment.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'denied', reason, decidedAt: now, updatedAt: now },
    });

    return count === 1;
  }

  async cancel(id: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.enrolment.updateMany({
      where: { id, status: 'approved' },
      data: { status: 'cancelled', endedAt: now, updatedAt: now },
    });

    return count === 1;
  }

  async takeOut(id: string, reason: string | null, now: Date): Promise<boolean> {
    const { count } = await this.prisma.enrolment.updateMany({
      where: { id, status: 'approved' },
      data: { status: 'takenOut', reason, endedAt: now, updatedAt: now },
    });

    return count === 1;
  }

  async countPendingForClass(classId: string): Promise<number> {
    return this.prisma.enrolment.count({ where: { classId, status: 'pending' } });
  }

  async releaseForStudent(studentId: string, now: Date): Promise<Enrolment[]> {
    // One transaction, and every write checks the status itself: an enrolment decided meanwhile is left alone.
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const records = await tx.enrolment.updateManyAndReturn({
        where: {
          studentId,
          status: 'approved',
          schoolClass: { startsAt: { gt: now }, cancelledAt: null },
        },
        data: { status: 'cancelled', endedAt: now, updatedAt: now },
      });

      await tx.enrolment.updateMany({
        where: { studentId, status: 'pending' },
        data: { status: 'withdrawn', endedAt: now, updatedAt: now },
      });

      return records;
    });

    return cancelled
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
