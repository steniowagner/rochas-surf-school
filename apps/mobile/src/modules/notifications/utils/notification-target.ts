import type { Href } from "expo-router";

import { routes } from "@/constants/routes";
import type { Flow } from "@/navigation/resolve-flow.types";

/**
 * Where a notification leads for the account's current flow, the same from its push and from its row on the
 * notifications screen (spec 055, D-07); `null` when it leads nowhere in that flow (an unknown type, a class that
 * isn't named, a flow it doesn't concern).
 */
export const notificationTarget = (
  type: unknown,
  classId: string | null,
  flow: Flow,
): Href | null => {
  if (type === "registration.pending" && flow === "admin") {
    return routes.admin.registrations;
  }

  // Admins act on a reactivation request: it opens the tool. Its decision leads to the flow's home.
  if (type === "reactivation.requested" && flow === "admin") {
    return routes.admin.reactivations;
  }

  // A batch has many classes and the push names none, a deleted class is gone, and a changed location concerns
  // several classes: the Aulas tab is where the schedule shows what changed.
  const opensClasses =
    type === "class.assigned" || type === "class.deleted" || type === "location.changed";

  if (opensClasses && flow === "instructor") {
    return routes.instructor.classes;
  }

  if (opensClasses && flow === "admin") {
    return routes.admin.classes;
  }

  // An edited, unassigned, cancelled or soon-starting class, or an admin's message to it, opens that class, in the
  // details of the flow the account resolves to.
  const isClassChange =
    type === "class.edited" ||
    type === "class.unassigned" ||
    type === "class.cancelled" ||
    type === "class.reminder" ||
    type === "class.message";

  if (isClassChange && classId !== null && flow === "instructor") {
    return routes.instructor.classDetail(classId);
  }

  if (isClassChange && classId !== null && flow === "admin") {
    return routes.admin.classDetail(classId);
  }

  // A student hears that the class they asked for or held a seat in was edited or cancelled, or started without a seat
  // for them, or that their request was approved or denied, or that the school enrolled them in a class or took them
  // out of one, or that their class starts soon, or an admin's message to it.
  const isStudentClassNews =
    type === "class.edited" ||
    type === "class.message" ||
    type === "class.reminder" ||
    type === "enrolment.expired" ||
    type === "enrolment.approved" ||
    type === "enrolment.denied" ||
    type === "enrolment.enrolled" ||
    type === "enrolment.takenOut" ||
    type === "class.cancelled";

  if (isStudentClassNews && classId !== null && flow === "student") {
    return routes.student.classDetail(classId);
  }

  // A changed location concerns several of a student's classes: the Agenda shows what changed.
  if (type === "location.changed" && flow === "student") {
    return routes.student.home;
  }

  // The class's instructors hear that a student asked for a seat, and a cancelled seat opens its class for the
  // class's instructors and for the admins.
  if (
    (type === "enrolment.requested" || type === "enrolment.cancelled") &&
    classId !== null &&
    flow === "instructor"
  ) {
    return routes.instructor.classDetail(classId);
  }

  if (type === "enrolment.cancelled" && classId !== null && flow === "admin") {
    return routes.admin.classDetail(classId);
  }

  // Admins act on the request: it opens the tool.
  if (type === "enrolment.requested" && flow === "admin") {
    return routes.admin.classRequests;
  }

  // Only admins hear about a class left without an instructor: it opens the earliest one, where to assign someone.
  if (type === "class.noInstructor" && classId !== null && flow === "admin") {
    return routes.admin.classDetail(classId);
  }

  return null;
};
