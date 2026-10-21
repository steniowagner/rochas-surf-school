import { SCHOOL_SETTINGS_ID } from '@rochas-surf-school/school-settings';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaWaitingListSetting } from './waiting-list-setting.prisma.js';

function setup(row: { waitingListEnabled: boolean } | null) {
  const schoolSettings = { findUnique: vi.fn(async () => row) };
  const setting = new PrismaWaitingListSetting({ schoolSettings } as unknown as PrismaService);

  return { schoolSettings, setting };
}

describe('PrismaWaitingListSetting', () => {
  it.each([[true], [false]])('answers the stored switch (%s)', async (enabled) => {
    const { schoolSettings, setting } = setup({ waitingListEnabled: enabled });

    expect(await setting.isEnabled()).toBe(enabled);
    expect(schoolSettings.findUnique).toHaveBeenCalledWith({
      where: { id: SCHOOL_SETTINGS_ID },
      select: { waitingListEnabled: true },
    });
  });

  it('is on while no settings row exists', async () => {
    expect(await setup(null).setting.isEnabled()).toBe(true);
  });
});
