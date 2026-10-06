# User Entity Pattern

This reference summarizes the real pattern observed in `modules/auth/src/user/model/user.entity.ts` and `modules/auth/test/user/model/user.entity.test.ts`.

## Entity structure

```ts
export interface UserState extends EntityState {
  name: string;
  email: string;
  password: string;
}

export class User extends Entity<UserState> {
  constructor(props: UserState) {
    super(props);
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get password(): string {
    return this.props.password;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "user.name",
        value: this.name,
        rules: [
          new RequiredRule(),
          new MinLengthRule(3),
          new MaxLengthRule(80),
          new PersonNameRule(),
        ],
      },
      {
        code: "user.email",
        value: this.email,
        rules: [new RequiredRule(), new EmailRule()],
      },
      {
        code: "user.password",
        value: this.password,
        rules: [new BcryptHashRule()],
      },
    ]);
  }
}
```

## Patterns to preserve

- `State` extends `EntityState`
- constructor only calls `super(props)`
- explicit getters
- manual and linear `validate()` with `Validator.validate([...])`
- predictable error codes via a per-field prefix

## Test pattern

Cover at least:

- creation of a valid entity
- getters
- timestamps inherited from the base class
- `clone()` preserving `id` and `createdAt` and updating `updatedAt`
- lazy validation
- success and failure of `validate()`
- expected error messages
- size and format boundary scenarios

Helper observed in the project:

```ts
function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}
```
