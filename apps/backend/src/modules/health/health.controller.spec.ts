import { RequestMethod, ServiceUnavailableException } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { PrismaService } from '../../db/prisma.service.js';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import { HealthController } from './health.controller.js';

function setup(query: () => Promise<unknown>) {
  const queryRaw = vi.fn(query);
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
  return { controller: new HealthController(prisma), queryRaw };
}

describe('HealthController', () => {
  const handler = Object.getOwnPropertyDescriptor(HealthController.prototype, 'check')!.value as object;

  it('is a public GET on /health', () => {
    expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe('health');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it('answers ok after running SELECT 1', async () => {
    const { controller, queryRaw } = setup(async () => [{ '?column?': 1 }]);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });

    const [strings] = queryRaw.mock.calls[0] as unknown as [TemplateStringsArray];
    expect(strings.join('')).toBe('SELECT 1');
  });

  it('answers 503 with the error key when the query fails', async () => {
    const { controller } = setup(async () => {
      throw new Error('connection refused');
    });

    const error = await controller.check().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).message).toBe('health.database.unreachable');
  });
});
