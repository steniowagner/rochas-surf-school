import { Location } from "../model";

export interface LocationOut {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  upcomingClasses: number;
}

export function toLocationOut(location: Location, upcomingClasses = 0): LocationOut {
  return {
    id: location.id,
    name: location.name,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    upcomingClasses,
  };
}
