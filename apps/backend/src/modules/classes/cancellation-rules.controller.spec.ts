import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { CancellationRule } from '@rochas-surf-school/classes';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaCancellationRuleRepository } from './cancellation-rule.prisma.js';
import { CancellationRulesController } from './cancellation-rules.controller.js';
import { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-18T12:00:00.000Z');

function userOf(role: string, status = 'approved'): AuthenticatedUser {
  return {
    id: '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34',
    email: 'user@example.com',
    role,
    status,
    claims: {},
  } as unknown as AuthenticatedUser;
}

function handlerOf(name: keyof CancellationRulesController): object {
  return Object.getOwnPropertyDescriptor(CancellationRulesController.prototype, name)!
    .value as object;
}

function setup() {
  let stored: CancellationRule[] = [
    new CancellationRule({ discipline: 'surf', text: 'Surf.', updatedBy: userOf('admin').id }),
  ];
  const repository = {
    findAll: vi.fn(async () => [...stored]),
    save: vi.fn(async (rule: CancellationRule) => {
      stored = [...stored.filter((item) => item.discipline !== rule.discipline), rule];
    }),
  };
  const controller = new CancellationRulesController(
    repository as unknown as PrismaCancellationRuleRepository,
    { now: () => NOW } as unknown as SystemClockProvider,
  );
  return { controller, repository };
}

describe('CancellationRulesController', () => {
  it.each([
    ['list', '/', RequestMethod.GET],
    ['save', ':discipline', RequestMethod.PUT],
  ] as const)('%s is a protected route answering 200', (name, path, method) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('lists both rules for any approved account', async () => {
    const { controller } = setup();

    expect(await controller.list(userOf('student'))).toEqual({ surf: 'Surf.', skate: null });
  });

  it('refuses a list for an account that is not approved', async () => {
    const { controller } = setup();

    await expect(controller.list(userOf('student', 'pending'))).rejects.toThrow('user.status.notApproved');
  });

  it('saves a rule for an admin with the clock of the system', async () => {
    const { controller, repository } = setup();

    const out = await controller.save(userOf('admin'), 'skate', { text: ' Skate. ' });

    expect(out).toEqual({ surf: 'Surf.', skate: 'Skate.' });
    expect(repository.save).toHaveBeenCalledWith(expect.any(CancellationRule), NOW);
  });

  it('refuses a student, a bad discipline and a missing body', async () => {
    const { controller, repository } = setup();

    await expect(controller.save(userOf('student'), 'surf', { text: 'x' })).rejects.toThrow('user.role.notAdmin');
    await expect(controller.save(userOf('admin'), 'kitesurf', { text: 'x' })).rejects.toThrow();
    await expect(controller.save(userOf('admin'), 'surf')).rejects.toThrow();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
