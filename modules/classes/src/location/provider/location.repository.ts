import { Location } from "../model";

export interface LocationRepository {
  findAll(): Promise<Location[]>;
  findById(id: string): Promise<Location | null>;
  existsByNameKey(nameKey: string): Promise<boolean>;
  create(location: Location): Promise<Location>;
}
