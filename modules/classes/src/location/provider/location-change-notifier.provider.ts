export interface LocationChanged {
  /** One entry per person (instructor or student): how many of their upcoming classes use the location. */
  recipients: { userId: string; count: number }[];
  /** The location's new name. */
  locationName: string;
}

export interface LocationChangeNotifier {
  locationChanged(event: LocationChanged): Promise<void>;
}
