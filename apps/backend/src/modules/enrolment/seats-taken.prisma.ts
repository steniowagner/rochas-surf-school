import { Prisma } from '../../generated/prisma/client.js';

type SeatsClient = Pick<Prisma.TransactionClient, 'enrolment' | 'guest'>;

/** Locks the class row, the lock every seat write takes, and answers its capacity; null when the class is gone. */
export async function lockClassCapacity(
  tx: Pick<Prisma.TransactionClient, '$queryRaw'>,
  classId: string,
): Promise<number | null> {
  const [locked] = await tx.$queryRaw<{ capacity: number }[]>(
    Prisma.sql`SELECT capacity FROM classes WHERE id = ${classId}::uuid FOR UPDATE`,
  );

  return locked ? locked.capacity : null;
}

/** The seats taken inside a transaction that holds the class lock: approved students plus guests. */
export async function countSeatsTaken(tx: SeatsClient, classId: string): Promise<number> {
  const [students, guests] = await Promise.all([
    tx.enrolment.count({ where: { classId, status: 'approved' } }),
    tx.guest.count({ where: { classId } }),
  ]);

  return students + guests;
}
