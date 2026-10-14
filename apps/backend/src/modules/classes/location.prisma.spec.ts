import { ConflictError } from '@rochas-surf-school/shared';
import { Location } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaLocationRepository } from './location.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const NOW = new Date('2026-10-14T12:00:00.000Z');

function setup() {
  const location = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  };
  const repository = new PrismaLocationRepository({ location } as unknown as PrismaService);
  return { location, repository };
}

function record(id = ID, name = 'Praia do Futuro') {
  return {
    id,
    name,
    nameKey: name.toLowerCase(),
    address: 'Av. Zezé Diogo, 5000',
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function domain() {
  return new Location({
    id: ID,
    name: 'Praia do Futuro',
    address: 'Av. Zezé Diogo, 5000',
    createdAt: NOW,
  });
}

describe('PrismaLocationRepository', () => {
  it('lists the locations ordered by name key, then id, mapped to the domain', async () => {
    const { location, repository } = setup();
    location.findMany.mockResolvedValue([record(ID, 'Áurea'), record()]);

    const locations = await repository.findAll();

    expect(location.findMany).toHaveBeenCalledWith({
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
    });
    expect(locations.map((item) => [item.id, item.name, item.nameKey])).toEqual([
      [ID, 'Áurea', 'aurea'],
      [ID, 'Praia do Futuro', 'praia do futuro'],
    ]);
  });

  it('finds a location by id', async () => {
    const { location, repository } = setup();
    location.findUnique.mockResolvedValue(record());

    const found = await repository.findById(ID);

    expect(location.findUnique).toHaveBeenCalledWith({ where: { id: ID } });
    expect(found?.address).toBe('Av. Zezé Diogo, 5000');
  });

  it('answers null for an unknown id, and without a lookup for one that is not a uuid', async () => {
    const { location, repository } = setup();
    location.findUnique.mockResolvedValue(null);

    expect(await repository.findById(ID)).toBeNull();
    expect(await repository.findById('not-a-uuid')).toBeNull();
    expect(location.findUnique).toHaveBeenCalledTimes(1);
  });

  it('tells whether a name key is taken', async () => {
    const { location, repository } = setup();
    location.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    expect(await repository.existsByNameKey('praia do futuro')).toBe(true);
    expect(await repository.existsByNameKey('outra')).toBe(false);
    expect(location.count).toHaveBeenCalledWith({ where: { nameKey: 'outra' } });
  });

  it('creates a location and returns it', async () => {
    const { location, repository } = setup();
    location.create.mockResolvedValue(record());

    const created = await repository.create(domain());

    expect(location.create).toHaveBeenCalledWith({
      data: {
        id: ID,
        name: 'Praia do Futuro',
        nameKey: 'praia do futuro',
        address: 'Av. Zezé Diogo, 5000',
        createdAt: NOW,
      },
    });
    expect(created.id).toBe(ID);
  });

  it('maps a unique violation to the duplicate conflict', async () => {
    const { location, repository } = setup();
    location.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    const error = await repository.create(domain()).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe('location.name.duplicate');
  });

  it('rethrows any other error', async () => {
    const { location, repository } = setup();
    location.create.mockRejectedValue(new Error('down'));
    await expect(repository.create(domain())).rejects.toThrow('down');

    location.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('other', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );
    await expect(repository.create(domain())).rejects.toThrow('other');
  });
});
