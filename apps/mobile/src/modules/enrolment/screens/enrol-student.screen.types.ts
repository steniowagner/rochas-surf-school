import type { VisibleRange } from "@/components/week-month-calendar/week-month-calendar.types";
import type { ClassItem } from "@/modules/classes/classes.types";
import type { Person } from "@/modules/people/people.types";

export type UseEnrolStudentScreenResult = {
  searchText: string;
  setSearchText: (text: string) => void;
  students: Person[];
  isLoadingStudents: boolean;
  isStudentsError: boolean;
  hasNoStudents: boolean;
  isFetchingMoreStudents: boolean;
  retryStudents: () => void;
  loadMoreStudents: () => void;
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
  isLoadingClasses: boolean;
  isClassesError: boolean;
  retryClasses: () => void;
  selectedClassId: string | null;
  selectClass: (id: string) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  submit: () => void;
};
