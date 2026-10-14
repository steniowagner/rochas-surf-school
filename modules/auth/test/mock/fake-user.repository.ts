import { PageResult } from "@rochas-surf-school/shared";
import {
  DirectoryPageParams,
  RulesAcceptance,
  User,
  UserPageParams,
  UserRepository,
} from "../../src";

function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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

  async findDirectoryPage(params: DirectoryPageParams): Promise<PageResult<User>> {
    const term = params.search ? fold(params.search) : undefined;
    const matches = this.users
      .filter((item) => item.status === "approved")
      .filter((item) => params.role === undefined || item.role === params.role)
      .filter((item) => term === undefined || fold(item.name).includes(term))
      .sort((a, b) => {
        return fold(a.name).localeCompare(fold(b.name)) || a.id.localeCompare(b.id);
      });
    const start = (params.page - 1) * params.perPage;

    return {
      items: matches.slice(start, start + params.perPage),
      page: params.page,
      perPage: params.perPage,
      total: matches.length,
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

  async findPending(): Promise<User[]> {
    return this.users
      .filter((item) => item.status === "pending")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async updateIfPending(user: User): Promise<boolean> {
    const index = this.users.findIndex((item) => item.equals(user));
    if (index === -1 || this.users[index].status !== "pending") return false;

    this.users[index] = user;
    return true;
  }

  async findDeniedBefore(cutoff: Date): Promise<string[]> {
    return this.users
      .filter(
        (item) =>
          item.status === "denied" && item.deniedAt !== undefined && item.deniedAt <= cutoff,
      )
      .map((item) => item.id);
  }

  async deleteDenied(ids: string[]): Promise<number> {
    const before = this.users.length;
    const kept = this.users.filter((item) => !(ids.includes(item.id) && item.status === "denied"));
    this.users.splice(0, before, ...kept);

    return before - kept.length;
  }

  async addRulesAcceptance(userId: string, acceptance: RulesAcceptance): Promise<void> {
    const index = this.users.findIndex((item) => item.id === userId);
    const user = this.users[index];
    if (!user || user.hasAcceptedRules(acceptance.version)) return;

    this.users[index] = user.clone({
      rulesAcceptances: [...user.rulesAcceptances, acceptance],
    });
  }
}
