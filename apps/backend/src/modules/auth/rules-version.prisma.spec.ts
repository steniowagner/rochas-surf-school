import { PrismaService } from '../../db/prisma.service.js';
import { PrismaRulesVersionProvider } from './rules-version.prisma.js';

function setup() {
  const rulesVersion = { findFirstOrThrow: vi.fn() };
  const provider = new PrismaRulesVersionProvider({ rulesVersion } as unknown as PrismaService);
  return { rulesVersion, provider };
}

describe('PrismaRulesVersionProvider', () => {
  it('reads the version of the single rules_versions row', async () => {
    const { rulesVersion, provider } = setup();
    rulesVersion.findFirstOrThrow.mockResolvedValue({ id: 1, version: 4 });

    await expect(provider.getCurrentVersion()).resolves.toBe(4);
    expect(rulesVersion.findFirstOrThrow).toHaveBeenCalledWith();
  });

  it('fails when the row is missing', async () => {
    const { rulesVersion, provider } = setup();
    rulesVersion.findFirstOrThrow.mockRejectedValue(new Error('No RulesVersion found'));

    await expect(provider.getCurrentVersion()).rejects.toThrow('No RulesVersion found');
  });
});
