import { PageResult } from "@rochas-surf-school/shared";
import { User, UserPageParams, UserRepository } from "../../src";

export class FakeUserRepository implements UserRepository {
  readonly users: User[];
  readonly searchedNames: string[] = [];

  constructor(users: User[] = []) {
    this.users = [...users];
  }

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async update(user: User): Promise<User> {
    const index = this.users.findIndex((item) => item.equals(user));
    if (index !== -1) this.users[index] = user;
    return user;
  }

  async delete(id: string): Promise<void> {
    const index = this.users.findIndex((item) => item.id === id);
    if (index !== -1) this.users.splice(index, 1);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((item) => item.id === id) ?? null;
  }

  async findPage(params: UserPageParams): Promise<PageResult<User>> {
    const start = (params.page - 1) * params.perPage;

    return {
      items: this.users.slice(start, start + params.perPage),
      page: params.page,
      perPage: params.perPage,
      total: this.users.length,
    };
  }

  async searchByName(name: string): Promise<User[]> {
    this.searchedNames.push(name);
    const term = name.trim().toLowerCase();

    return this.users.filter((item) => item.name.toLowerCase().includes(term));
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((item) => item.email === email) ?? null;
  }
}
