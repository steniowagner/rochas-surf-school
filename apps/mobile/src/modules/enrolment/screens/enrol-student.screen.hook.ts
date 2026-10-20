import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { VisibleRange } from "@/components/week-month-calendar/week-month-calendar.types";
import { useDebouncedValue } from "@/modules/classes/hooks/use-debounced-value.hook";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { useVisibleWeeksClasses } from "@/modules/classes/hooks/use-visible-weeks-classes.hook";
import { useWeekClasses } from "@/modules/classes/hooks/use-week-classes.hook";
import { todayInSchoolZone } from "@/modules/classes/utils/calendar";
import { isClassFull } from "@/modules/classes/utils/occupancy";
import { schoolDayOf } from "@/modules/classes/utils/week";
import { usePeople } from "@/modules/people/hooks/use-people.hook";
import type { Person } from "@/modules/people/people.types";
import { useAlertMessage } from "@/providers/alert-message";
import { SessionExpiredError } from "@/services/api";
import { addDays, mondayOf } from "@/utils/calendar-dates";

import { useEnrolStudent } from "../hooks/use-enrol-student.hook";
import {
  getEnrolStudentErrorKey,
  shouldReloadEnrolClasses,
} from "../utils/enrolment-error";

import type { UseEnrolStudentScreenResult } from "./enrol-student.screen.types";

const SEARCH_DEBOUNCE_MS = 300;
const STUDENT_ROLES: Person["role"][] = ["student"];

export const useEnrolStudentScreen = (): UseEnrolStudentScreenResult => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const enrolMutation = useEnrolStudent();
  const now = useNow();
  const today = todayInSchoolZone(now);
  const currentWeek = mondayOf(today);

  const [searchText, setSearchText] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Person | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({
    from: currentWeek,
    to: addDays(currentWeek, 6),
  });
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A second press in the same frame must not send twice, before `isSubmitting` has re-rendered.
  const inFlight = useRef(false);

  const search = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const people = usePeople({ roles: STUDENT_ROLES, search });
  const weekQuery = useWeekClasses(mondayOf(selectedDate));
  const visibleWeeks = useVisibleWeeksClasses(visibleRange);

  const startedBefore = now.getTime();
  const dayItems = (weekQuery.data?.items ?? []).filter(
    (item) =>
      schoolDayOf(item.startsAt) === selectedDate &&
      !item.cancelledAt &&
      new Date(item.startsAt).getTime() > startedBefore,
  );
  const upcoming = visibleWeeks.items.filter(
    (item) => !item.cancelledAt && new Date(item.startsAt).getTime() > startedBefore,
  );
  const markedDates = [...new Set(upcoming.map((item) => schoolDayOf(item.startsAt)))];
  const selectedClass = dayItems.find((item) => item.id === selectedClassId);
  const canSubmit =
    selectedStudent !== null &&
    selectedClass !== undefined &&
    !isClassFull(selectedClass.seatsTaken, selectedClass.capacity);

  const loadMoreStudents = () => {
    if (people.hasNextPage && !people.isFetchingNextPage) {
      void people.fetchNextPage();
    }
  };

  const submit = async () => {
    if (!canSubmit || !selectedStudent || !selectedClass || inFlight.current) {
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);

    try {
      await enrolMutation.mutateAsync({
        classId: selectedClass.id,
        studentId: selectedStudent.id,
      });
      alertMessage.show(t("enrolStudent.done", { name: selectedStudent.name }));
      router.back();
    } catch (error) {
      const key = getEnrolStudentErrorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }

      if (shouldReloadEnrolClasses(error)) {
        setSelectedClassId(null);
        void visibleWeeks.refetch();
      }
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    searchText,
    setSearchText,
    students: people.people,
    isLoadingStudents: people.isPending,
    // An expired session is handled once, centrally.
    isStudentsError:
      people.isError &&
      people.people.length === 0 &&
      !(people.error instanceof SessionExpiredError),
    hasNoStudents: people.isSuccess && people.people.length === 0,
    isFetchingMoreStudents: people.isFetchingNextPage,
    retryStudents: () => void people.refetch(),
    loadMoreStudents,
    selectedStudent,
    selectStudent: setSelectedStudent,
    now,
    today,
    selectedDate,
    markedDates,
    selectDate: (date) => {
      setSelectedDate(date);
      setSelectedClassId(null);
    },
    updateVisibleRange: (range) =>
      setVisibleRange((current) =>
        current.from === range.from && current.to === range.to ? current : range,
      ),
    dayItems,
    isLoadingClasses: weekQuery.isPending,
    isClassesError: weekQuery.isError && !(weekQuery.error instanceof SessionExpiredError),
    retryClasses: () => void weekQuery.refetch(),
    selectedClassId,
    selectClass: setSelectedClassId,
    canSubmit,
    isSubmitting,
    submit,
  };
};
