import { UserRole } from "../model";

export interface RoleChangedEvent {
  userId: string;
  /** The new role. */
  role: UserRole;
  /** Whether the change gave up upcoming seats or pending requests. */
  seatsReleased: boolean;
  /** Whether the change took the person off upcoming classes. */
  classesReleased: boolean;
}

/** Tells a person their role changed; implemented by the backend module that owns notifications. */
export interface RoleChangeNotifier {
  roleChanged(event: RoleChangedEvent): Promise<void>;
}
