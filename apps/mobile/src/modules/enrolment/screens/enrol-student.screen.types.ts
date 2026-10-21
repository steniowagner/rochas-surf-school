import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import type { VisibleRange } from "@/components/week-month-calendar/week-month-calendar.types";
import type { ClassItem } from "@/modules/classes/classes.types";
import type { Person } from "@/modules/people/people.types";

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
};
