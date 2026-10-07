import * as shared from './index.js';

describe('shared barrel', () => {
  it('exposes the guard, decorators and error filter', () => {
    expect(shared.JwtAuthGuard).toBeDefined();
    expect(shared.JwtAuthModule).toBeDefined();
    expect(shared.JwtStrategy).toBeDefined();
    expect(shared.mapJwtPayloadToAuthenticatedUser).toBeDefined();
    expect(shared.CurrentUser).toBeDefined();
    expect(shared.Public).toBeDefined();
    expect(shared.ApiExceptionFilter).toBeDefined();
  });
});
