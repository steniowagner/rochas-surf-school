import { ClassMessage } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaClassMessageRepository } from './class-message.prisma.js';

const CLASS_ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const SENDER_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const CREATED_AT = new Date('2026-10-14T13:00:00.000Z');
const SENDER = {
  id: SENDER_ID,
  name: 'Ana Souza',
  photoUrl: null,
  role: 'admin',
  status: 'approved',
  whatsappNumber: '+5585999999999',
  whatsappVisible: true,
};
const RECORD = {
  id: 'm-1',
  title: 'Aviso',
  message: 'Tragam protetor.',
  createdAt: CREATED_AT,
  sender: SENDER,
};

function setup(records: unknown[] = []) {
  const create = vi.fn().mockResolvedValue(undefined);
  const findMany = vi.fn().mockResolvedValue(records);
  const repository = new PrismaClassMessageRepository({
    classMessage: { create, findMany },
  } as unknown as PrismaService);

  return { create, findMany, repository };
}

describe('PrismaClassMessageRepository', () => {
  it('stores a message', async () => {
    const { create, repository } = setup();
    const message = new ClassMessage({
      classId: CLASS_ID,
      senderId: SENDER_ID,
      title: 'Aviso',
      message: 'Tragam protetor.',
      createdAt: CREATED_AT,
    });

    await expect(repository.create(message)).resolves.toBe(message);

    expect(create).toHaveBeenCalledWith({
      data: {
        id: message.id,
        classId: CLASS_ID,
        senderId: SENDER_ID,
        title: 'Aviso',
        message: 'Tragam protetor.',
        createdAt: CREATED_AT,
      },
    });
  });

  it("reads a class's messages, newest first, with their sender", async () => {
    const { findMany, repository } = setup([RECORD]);

    await expect(repository.findByClass(CLASS_ID)).resolves.toEqual([RECORD]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { classId: CLASS_ID },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('answers sender null for an erased account, keeping the message', async () => {
    const { repository } = setup([
      { ...RECORD, sender: { ...SENDER, name: null, status: 'erased' } },
    ]);

    const [view] = await repository.findByClass(CLASS_ID);

    expect(view).toEqual({ ...RECORD, sender: null });
  });
});
