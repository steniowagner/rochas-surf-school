import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  DomainError,
  ValidationError,
  ValidationException,
} from '@rochas-surf-school/shared';
import { ApiExceptionFilter } from './api-exception.filter.js';
import { ApiErrorResponse } from './error-response.type.js';

function run(exception: unknown): { status: number; body: ApiErrorResponse } {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/auth/email/code' }),
    }),
  } as unknown as ArgumentsHost;

  new ApiExceptionFilter().catch(exception, host);

  return {
    status: response.status.mock.calls[0]![0] as number,
    body: response.json.mock.calls[0]![0] as ApiErrorResponse,
  };
}

describe('ApiExceptionFilter', () => {
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists every key of a ValidationException', () => {
    const { status, body } = run(
      new ValidationException([
        new ValidationError('user.name.min.length'),
        new ValidationError('user.name.person.name'),
      ]),
    );

    expect(status).toBe(422);
    expect(body).toEqual({
      statusCode: 422,
      errors: ['user.name.min.length', 'user.name.person.name'],
      message: 'Validation failed',
      path: '/auth/email/code',
      timestamp: expect.any(String),
    });
  });

  it('turns a single ValidationError into one key', () => {
    const { status, body } = run(new ValidationError('user.email.invalid.email'));

    expect(status).toBe(422);
    expect(body.errors).toEqual(['user.email.invalid.email']);
  });

  it('passes the details of a DomainError to the response', () => {
    const details = { resendAvailableAt: '2026-10-07T12:00:30.000Z' };

    const { status, body } = run(
      new DomainError('signInCode.resend.tooSoon', 429, details),
    );

    expect(status).toBe(429);
    expect(body.errors).toEqual(['signInCode.resend.tooSoon']);
    expect(body.details).toEqual(details);
  });

  it('leaves details out of a DomainError without them', () => {
    const { status, body } = run(new DomainError('signInCode.code.invalid', 401));

    expect(status).toBe(401);
    expect(body.errors).toEqual(['signInCode.code.invalid']);
    expect(JSON.parse(JSON.stringify(body))).not.toHaveProperty('details');
  });

  it('maps an HttpException with a string response', () => {
    const { status, body } = run(
      new HttpException('request.rate.limited', HttpStatus.TOO_MANY_REQUESTS),
    );

    expect(status).toBe(429);
    expect(body.errors).toEqual(['request.rate.limited']);
    expect(body.details).toBeUndefined();
  });

  it('maps an HttpException whose response has a list of messages', () => {
    const { body } = run(new BadRequestException(['a.b.c', 'd.e.f']));

    expect(body.statusCode).toBe(400);
    expect(body.errors).toEqual(['a.b.c', 'd.e.f']);
    expect(body.details).toEqual(expect.objectContaining({ statusCode: 400 }));
  });

  it('maps an HttpException whose response has one message', () => {
    const { body } = run(new BadRequestException('a.b.c'));

    expect(body.errors).toEqual(['a.b.c']);
  });

  it('falls back to the exception message when the response has none', () => {
    const { body } = run(new HttpException({ reason: 'x' }, 418));

    expect(body.statusCode).toBe(418);
    expect(body.errors).toEqual(['Http Exception']);
  });

  it('hides unexpected errors behind INTERNAL_SERVER_ERROR and logs them', () => {
    const { status, body } = run(new Error('boom'));

    expect(status).toBe(500);
    expect(body.errors).toEqual(['INTERNAL_SERVER_ERROR']);
    expect(logError).toHaveBeenCalledWith(
      'INTERNAL_SERVER_ERROR',
      expect.stringContaining('boom'),
    );
  });

  it('logs a 5xx DomainError', () => {
    const { status } = run(new DomainError('signInCode.email.sendFailed', 502));

    expect(status).toBe(502);
    expect(logError).toHaveBeenCalled();
  });

  it('does not log client errors', () => {
    run(new DomainError('signInCode.code.invalid', 401));

    expect(logError).not.toHaveBeenCalled();
  });
});
