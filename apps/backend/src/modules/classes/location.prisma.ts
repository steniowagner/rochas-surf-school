import { Injectable } from '@nestjs/common';
import { ConflictError, UuidRule } from '@rochas-surf-school/shared';
import {
  ActiveLocation,
  Location,
  LocationRepository,
  LocationUpdateOptions,
  UpcomingInstructorCount,
} from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Location as LocationRecord } from '../../generated/prisma/client.js';

const UNIQUE_VIOLATION = 'P2002';
const uuidRule = new UuidRule();

@Injectable()
export class PrismaLocationRepository implements LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(now: Date): Promise<ActiveLocation[]> {
    const records = await this.prisma.location.findMany({
      where: { archivedAt: null },
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
      include: {
        _count: { select: { classes: { where: { startsAt: { gt: now }, cancelledAt: null } } } },
      },
    });
    return records.map((record) => ({
      location: this.toDomain(record),
      upcomingClasses: record._count.classes,
    }));
  }

  async findById(id: string): Promise<Location | null> {
    if (uuidRule.validate(id) !== null) return null;

    const record = await this.prisma.location.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async existsByNameKey(nameKey: string): Promise<boolean> {
    const count = await this.prisma.location.count({ where: { nameKey } });
    return count > 0;
  }

  async create(location: Location): Promise<Location> {
    try {
      const record = await this.prisma.location.create({
        data: {
          id: location.id,
          name: location.name,
          nameKey: location.nameKey,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          createdAt: location.createdAt,
        },
      });
      return this.toDomain(record);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async update(location: Location, options: LocationUpdateOptions): Promise<Location> {
    try {
      // The edit and the clearing of the upcoming classes' deadlines are all or nothing.
      const record = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.location.update({
          where: { id: location.id },
          data: {
            name: location.name,
            nameKey: location.nameKey,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });

        if (options.clearDeadlinesFrom) {
          await tx.schoolClass.updateMany({
            where: {
              locationId: location.id,
              startsAt: { gt: options.clearDeadlinesFrom },
              cancelledAt: null,
            },
            data: {
              cancellationDeadline: null,
              deadlineAttempts: 0,
              deadlineNextAttemptAt: null,
              deadlineRevision: { increment: 1 },
            },
          });
        }

        return updated;
      });
      return this.toDomain(record);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async archive(id: string): Promise<boolean> {
    // Conditional on the location being active: of two concurrent archives, one finds nothing to write.
    const { count } = await this.prisma.location.updateMany({
      where: { id, archivedAt: null },
      data: { archivedAt: new Date(), nameKey: null },
    });
    return count > 0;
  }

  async findUpcomingInstructorCounts(
    locationId: string,
    now: Date,
  ): Promise<UpcomingInstructorCount[]> {
    const groups = await this.prisma.classInstructor.groupBy({
      by: ['userId'],
      where: { schoolClass: { locationId, startsAt: { gt: now }, cancelledAt: null } },
      _count: { _all: true },
      orderBy: { userId: 'asc' },
    });
    return groups.map((group) => ({ instructorId: group.userId, count: group._count._all }));
  }

  private mapError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return new ConflictError('location.name.duplicate');
    }
    return error;
  }

  private toDomain(record: LocationRecord): Location {
    return new Location({
      id: record.id,
      name: record.name,
      address: record.address,
      latitude: record.latitude,
      longitude: record.longitude,
      archivedAt: record.archivedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
