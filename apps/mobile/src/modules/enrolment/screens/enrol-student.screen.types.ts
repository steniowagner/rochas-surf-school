import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { usePhoneNumberField } from "@/components/phone-number-field";
import type { TextInputStatus } from "@/components/ui/text-input/text-input.types";
import type { VisibleRange } from "@/components/week-month-calendar/week-month-calendar.types";
import type { ClassItem } from "@/modules/classes/classes.types";
import type { Person } from "@/modules/people/people.types";

/** Whom the admin is enrolling: a student of the school, or a trial guest with no account. */
export type EnrolMode = "student" | "trial";

export type UseEnrolStudentScreenResult = {
  searchText: string;
  setSearchText: (text: string) => void;
  students: (Person & { selected: boolean })[];
  isLoadingStudents: boolean;
  isStudentsError: boolean;
  hasNoStudents: boolean;
  isFetchingMoreStudents: boolean;
  retryStudents: () => void;
  loadMoreStudents: () => void;
  /** Loads the next page of students once the list is scrolled near its end. */
  loadMoreOnScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  selectedStudent: Person | null;
  selectStudent: (student: Person) => void;
  now: Date;
  today: string;
  selectedDate: string;
  markedDates: string[];
  selectDate: (date: string) => void;
  updateVisibleRange: (range: VisibleRange) => void;
  /** The selected day's classes that haven't started and aren't cancelled. */
  dayItems: ClassItem[];
  /** `dayItems` with whether each is full (not selectable) and whether it is the selected one. */
  classCards: { item: ClassItem; full: boolean; selected: boolean }[];
  isLoadingClasses: boolean;
  isClassesError: boolean;
  retryClasses: () => void;
  selectedClassId: string | null;
  selectClass: (id: string) => void;
  isSubmitting: boolean;
  /** Sends the enrolment; undefined until a student and a class with a free seat are picked. */
  submit: (() => Promise<void>) | undefined;
  /** Whom the submit button enrols, or `null` while nobody is picked (student) or typed (trial). */
  submitName: string | null;
  mode: EnrolMode;
  setMode: (mode: EnrolMode) => void;
  guestName: string;
  setGuestName: (name: string) => void;
  guestNameStatus: TextInputStatus;
  /** The name field was left: from now on it shows its error. */
  touchGuestName: () => void;
  /** The trial guest's WhatsApp number (country, mask, E.164, validity). */
  phone: ReturnType<typeof usePhoneNumberField>;
};
