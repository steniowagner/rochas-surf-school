import { NoEnrolmentPendingRequestCounter } from './no-enrolment.pending-request-counter.js';

describe('NoEnrolmentPendingRequestCounter', () => {
  it('counts no pending request for any class', async () => {
    const counter = new NoEnrolmentPendingRequestCounter();

    expect(await counter.countPendingRequests()).toBe(0);
  });
});
