export const LOCATION_NAME_MAX = 40;
export const LOCATION_ADDRESS_MAX = 200;

export function normalizeLocationName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}
