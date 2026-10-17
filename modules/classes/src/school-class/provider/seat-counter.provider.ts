export interface SeatCounter {
  /** The seats of the class that are taken (approved enrolments plus guests). */
  countSeatsTaken(classId: string): Promise<number>;
}
