import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { SchoolRule } from '@rochas-surf-school/school-rules';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaSchoolRuleRepository } from './school-rule.prisma.js';
import { SchoolRulesController } from './school-rules.controller.js';

const ADMIN = {
  id: '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34',
  email: 'admin@example.com',
  role: 'admin',
  status: 'approved',
  claims: {},
} as unknown as AuthenticatedUser;

function handlerOf(name: keyof SchoolRulesController): object {
  return Object.getOwnPropertyDescriptor(SchoolRulesController.prototype, name)!.value as object;
}

function setup() {
  const rules = [
    new SchoolRule({ title: 'a', description: 'a description', index: 1 }),
    new SchoolRule({ title: 'b', description: 'b description', index: 2 }),
  ];
  let version = 3;
  const repository = {
    findAll: vi.fn(async () => [...rules].sort((x, y) => x.index - y.index)),
    findById: vi.fn(async (id: string) => rules.find((item) => item.id === id) ?? null),
    getVersion: vi.fn(async () => version),
    apply: vi.fn(async (change: { save: SchoolRule[]; delete: string[]; bumpVersion: boolean }) => {
      for (const id of change.delete) rules.splice(rules.findIndex((r) => r.id === id), 1);
      for (const rule of change.save) {
        const at = rules.findIndex((r) => r.id === rule.id);
        if (at === -1) rules.push(rule);
        else rules[at] = rule;
      }
      if (change.bumpVersion) version += 1;
      return version;
    }),
  };
  const controller = new SchoolRulesController(repository as unknown as PrismaSchoolRuleRepository);
  return { controller, repository, rules };
}

describe('SchoolRulesController', () => {
  it.each([
    ['list', '/', RequestMethod.GET, HttpStatus.OK],
    ['create', '/', RequestMethod.POST, HttpStatus.CREATED],
    ['reorder', 'order', RequestMethod.PUT, HttpStatus.OK],
    ['update', ':id', RequestMethod.PUT, HttpStatus.OK],
    ['delete', ':id', RequestMethod.DELETE, HttpStatus.OK],
  ] as const)('%s is a protected %s route answering %s', (name, path, method, status) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('declares order before :id so "order" is not read as an id', () => {
    const names = Object.getOwnPropertyNames(SchoolRulesController.prototype);

    expect(names.indexOf('reorder')).toBeLessThan(names.indexOf('update'));
  });

  it('lists the rules for the signed-in account', async () => {
    const { controller, rules } = setup();

    const out = await controller.list(ADMIN);

    expect(out.version).toBe(3);
    expect(out.rules.map((item) => item.id)).toEqual(rules.map((item) => item.id));
  });

  it('creates a rule passing the signed-in admin', async () => {
    const { controller, repository } = setup();

    const out = await controller.create(ADMIN, { title: ' c ', description: 'c description' });

    expect(out.version).toBe(4);
    expect(out.rules.at(-1)).toMatchObject({ title: 'c', index: 3 });
    expect(repository.apply.mock.calls[0][0].save[0].createdBy).toBe(ADMIN.id);
  });

  it('answers 422 when creating without a body', async () => {
    const { controller } = setup();

    await expect(controller.create(ADMIN, undefined)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('edits a rule', async () => {
    const { controller, rules } = setup();

    const out = await controller.update(ADMIN, rules[1].id, { title: 'x', description: 'y' });

    expect(out.version).toBe(4);
    expect(out.rules[1]).toMatchObject({ id: rules[1].id, title: 'x', description: 'y' });
  });

  it('answers 404 when editing an unknown rule', async () => {
    const { controller } = setup();

    await expect(
      controller.update(ADMIN, 'missing', { title: 'x', description: 'y' }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'schoolRule.id.notFound' });
  });

  it('deletes a rule', async () => {
    const { controller, rules } = setup();
    const [first, second] = rules.map((item) => item.id);

    const out = await controller.delete(ADMIN, first);

    expect(out.version).toBe(4);
    expect(out.rules).toEqual([expect.objectContaining({ id: second, index: 1 })]);
  });

  it('reorders the rules without raising the version', async () => {
    const { controller, rules } = setup();

    const out = await controller.reorder(ADMIN, { ruleIds: [rules[1].id, rules[0].id] });

    expect(out.version).toBe(3);
    expect(out.rules.map((item) => item.id)).toEqual([rules[1].id, rules[0].id]);
  });

  it('answers 422 when reordering without a body', async () => {
    const { controller } = setup();

    await expect(controller.reorder(ADMIN, undefined)).rejects.toMatchObject({
      statusCode: 422,
      errors: [expect.objectContaining({ message: 'schoolRule.order.required' })],
    });
  });
});
