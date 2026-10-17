import { NoEnrolmentSeatCounter } from './no-enrolment.seat-counter.js';

describe('NoEnrolmentSeatCounter', () => {
  it('counts no seat taken for any class', async () => {
    const counter = new NoEnrolmentSeatCounter();

    expect(await counter.countSeatsTaken()).toBe(0);
  });
});
