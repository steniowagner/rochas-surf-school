import { router } from "expo-router";
import { useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
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
const END_REACHED_OFFSET = 80;

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
  // Both picked, and the class still has a free seat (a reload may have filled it).
  const target =
    selectedStudent && selectedClass && !isClassFull(selectedClass.seatsTaken, selectedClass.capacity)
      ? { student: selectedStudent, classId: selectedClass.id }
      : null;

  const loadMoreStudents = () => {
    if (people.hasNextPage && !people.isFetchingNextPage) {
      void people.fetchNextPage();
    }
  };

  const loadMoreOnScroll = ({
    nativeEvent,
  }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;

    if (
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - END_REACHED_OFFSET
    ) {
      loadMoreStudents();
    }
  };

  const classCards = dayItems.map((item) => ({
    item,
    full: isClassFull(item.seatsTaken, item.capacity),
    selected: selectedClassId === item.id,
  }));

  const submit = async ({ student, classId }: NonNullable<typeof target>) => {
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);

    try {
      await enrolMutation.mutateAsync({ classId, studentId: student.id });
      alertMessage.show(t("enrolStudent.done", { name: student.name }));
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
    students: people.people.map((student) => ({
      ...student,
      selected: selectedStudent?.id === student.id,
    })),
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
    loadMoreOnScroll,
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
    classCards,
    isLoadingClasses: weekQuery.isPending,
    isClassesError: weekQuery.isError && !(weekQuery.error instanceof SessionExpiredError),
    retryClasses: () => void weekQuery.refetch(),
    selectedClassId,
    selectClass: setSelectedClassId,
    // Undefined until a student and a class with a free seat are picked.
    submit: target ? () => submit(target) : undefined,
    isSubmitting,
  };
};
