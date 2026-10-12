import {
  SCHOOL_SETTINGS_ID,
  SchoolSettings,
} from '@rochas-surf-school/school-settings';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaSchoolSettingsRepository } from './school-settings.prisma.js';

const CREATED_AT = new Date('2026-10-11T12:00:00.000Z');
const UPDATED_AT = new Date('2026-10-12T08:30:00.000Z');

function setup() {
  const schoolSettings = { findUnique: vi.fn(), upsert: vi.fn() };
  const prisma = { schoolSettings } as unknown as PrismaService;
  return {
    schoolSettings,
    repository: new PrismaSchoolSettingsRepository(prisma),
  };
}

describe('PrismaSchoolSettingsRepository', () => {
  it('reads the fixed row and maps it to the domain', async () => {
    const { schoolSettings, repository } = setup();
    schoolSettings.findUnique.mockResolvedValue({
      id: SCHOOL_SETTINGS_ID,
      whatsappNumber: '+5585999998888',
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });

    const settings = await repository.get();

    expect(schoolSettings.findUnique).toHaveBeenCalledWith({
      where: { id: SCHOOL_SETTINGS_ID },
    });
    expect(settings).toBeInstanceOf(SchoolSettings);
    expect(settings?.id).toBe(SCHOOL_SETTINGS_ID);
    expect(settings?.whatsappNumber).toBe('+5585999998888');
    expect(settings?.createdAt).toEqual(CREATED_AT);
    expect(settings?.updatedAt).toEqual(UPDATED_AT);
  });

  it('maps a stored null number to undefined', async () => {
    const { schoolSettings, repository } = setup();
    schoolSettings.findUnique.mockResolvedValue({
      id: SCHOOL_SETTINGS_ID,
      whatsappNumber: null,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });

    const settings = await repository.get();

    expect(settings?.whatsappNumber).toBeUndefined();
  });

  it('answers null when no row exists', async () => {
    const { schoolSettings, repository } = setup();
    schoolSettings.findUnique.mockResolvedValue(null);

    await expect(repository.get()).resolves.toBeNull();
  });

  it('upserts the fixed row with the number', async () => {
    const { schoolSettings, repository } = setup();

    await repository.save(
      new SchoolSettings({
        id: SCHOOL_SETTINGS_ID,
        whatsappNumber: '+351912345678',
      }),
    );

    expect(schoolSettings.upsert).toHaveBeenCalledWith({
      where: { id: SCHOOL_SETTINGS_ID },
      create: { id: SCHOOL_SETTINGS_ID, whatsappNumber: '+351912345678' },
      update: { whatsappNumber: '+351912345678' },
    });
  });

  it('writes null when the settings carry no number', async () => {
    const { schoolSettings, repository } = setup();

    await repository.save(new SchoolSettings({ id: SCHOOL_SETTINGS_ID }));

    expect(schoolSettings.upsert).toHaveBeenCalledWith({
      where: { id: SCHOOL_SETTINGS_ID },
      create: { id: SCHOOL_SETTINGS_ID, whatsappNumber: null },
      update: { whatsappNumber: null },
    });
  });
});
