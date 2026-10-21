import { Injectable } from '@nestjs/common';
import { AddGuestResult, Guest, GuestRepository } from '@rochas-surf-school/enrolment';
import { PrismaService } from '../../db/prisma.service.js';
import type { Guest as GuestRecord } from '../../generated/prisma/client.js';
import { countSeatsTaken, lockClassCapacity } from './seats-taken.prisma.js';

@Injectable()
export class PrismaGuestRepository implements GuestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(guest: Guest): Promise<AddGuestResult> {
    return this.prisma.$transaction(async (tx): Promise<AddGuestResult> => {
      // The class row is the lock every seat change takes, so this write and an approval run one after the other.
      const capacity = await lockClassCapacity(tx, guest.classId);

      if (capacity === null || (await countSeatsTaken(tx, guest.classId)) >= capacity) {
        return 'full';
      }

      await tx.guest.create({
        data: {
          id: guest.id,
          classId: guest.classId,
          name: guest.name,
          whatsappNumber: guest.whatsappNumber,
          createdBy: guest.createdBy,
          createdAt: guest.createdAt,
        },
      });

      return 'added';
    });
  }

  async findById(id: string): Promise<Guest | null> {
    const record = await this.prisma.guest.findUnique({ where: { id } });

    return record ? this.toDomain(record) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { count } = await this.prisma.guest.deleteMany({ where: { id } });

    return count === 1;
  }

  async eraseEndedBefore(cutoff: Date, now: Date): Promise<number> {
    // One write: the check sits in it, so a second run finds nothing left to erase.
    const { count } = await this.prisma.guest.updateMany({
      where: {
        erasedAt: null,
        OR: [{ schoolClass: { endsAt: { lte: cutoff } } }, { schoolClass: { cancelledAt: { lte: cutoff } } }],
      },
      data: { name: null, whatsappNumber: null, erasedAt: now, updatedAt: now },
    });

    return count;
  }

  private toDomain(record: GuestRecord): Guest {
    return new Guest({
      id: record.id,
      classId: record.classId,
      name: record.name,
      whatsappNumber: record.whatsappNumber,
      createdBy: record.createdBy,
      erasedAt: record.erasedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
