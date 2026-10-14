import { Location } from "../model";

export interface LocationOut {
  id: string;
  name: string;
  address: string;
}

export function toLocationOut(location: Location): LocationOut {
  return { id: location.id, name: location.name, address: location.address };
}
