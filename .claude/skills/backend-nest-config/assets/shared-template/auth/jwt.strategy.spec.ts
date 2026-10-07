import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  it('refuses to start without JWT_SECRET', () => {
    expect(() => new JwtStrategy(new ConfigService({}))).toThrow(
      'JWT_SECRET is not configured',
    );
  });

  it('maps the payload to the authenticated user', () => {
    const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'secret' }));
    const payload = { sub: 'user-1', email: 'ana@example.com' };

    expect(strategy.validate(payload)).toEqual({
      id: 'user-1',
      email: 'ana@example.com',
      claims: payload,
    });
  });

  it('leaves the email out when the payload has none', () => {
    const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'secret' }));

    expect(strategy.validate({ sub: 'user-1', email: 42 as never }).email).toBeUndefined();
  });
});
