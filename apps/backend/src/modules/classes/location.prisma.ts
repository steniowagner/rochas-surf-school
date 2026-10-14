import { Injectable } from '@nestjs/common';
import { ConflictError, UuidRule } from '@rochas-surf-school/shared';
import { Location, LocationRepository } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { Location as LocationRecord } from '../../generated/prisma/client.js';

const UNIQUE_VIOLATION = 'P2002';
const uuidRule = new UuidRule();

@Injectable()
export class PrismaLocationRepository implements LocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Location[]> {
    const records = await this.prisma.location.findMany({
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
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
          createdAt: location.createdAt,
        },
      });
      return this.toDomain(record);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError('location.name.duplicate');
      }
      throw error;
    }
  }

  private toDomain(record: LocationRecord): Location {
    return new Location({
      id: record.id,
      name: record.name,
      address: record.address,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
