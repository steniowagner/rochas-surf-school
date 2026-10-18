export interface LocationChanged {
  /** One entry per instructor: how many of their upcoming classes use the location. */
  recipients: { instructorId: string; count: number }[];
  /** The location's new name. */
  locationName: string;
}

export interface LocationChangeNotifier {
  locationChanged(event: LocationChanged): Promise<void>;
}
