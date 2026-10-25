import { router } from "expo-router";
import { useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useTranslation } from "react-i18next";

import { usePhoneNumberField } from "@/components/phone-number-field";
import type { VisibleRange } from "@/components/week-month-calendar/week-month-calendar.types";
import { getStatus, isValid, nameRules } from "@/modules/auth/utils/field-validation";
import type { DisciplineFilterValue } from "@/modules/classes/classes.types";
import { useDebouncedValue } from "@/modules/classes/hooks/use-debounced-value.hook";
import { useNow } from "@/modules/classes/hooks/use-now.hook";
import { useVisibleWeeksClasses } from "@/modules/classes/hooks/use-visible-weeks-classes.hook";
import { useWeekClasses } from "@/modules/classes/hooks/use-week-classes.hook";
import { todayInSchoolZone } from "@/modules/classes/utils/calendar";
import { isClassFull } from "@/modules/classes/utils/occupancy";
import { schoolDayOf, schoolTimeOf } from "@/modules/classes/utils/week";
import { usePeople } from "@/modules/people/hooks/use-people.hook";
import type { Person } from "@/modules/people/people.types";
import { useAlertMessage } from "@/providers/alert-message";
import { SessionExpiredError } from "@/services/api";
import { addDays, formatIsoDate, getDateLocale, mondayOf } from "@/utils/calendar-dates";

import { useAddGuest } from "../hooks/use-add-guest.hook";
import { useEnrolStudent } from "../hooks/use-enrol-student.hook";
import {
  getAddGuestErrorKey,
  getEnrolStudentErrorKey,
  shouldReloadAddGuestClasses,
  shouldReloadEnrolClasses,
} from "../utils/enrolment-error";

import type { EnrolMode, EnrolStep, UseEnrolStudentScreenResult } from "./enrol-student.screen.types";

const SEARCH_DEBOUNCE_MS = 300;
const STUDENT_ROLES: Person["role"][] = ["student"];
const END_REACHED_OFFSET = 80;

/** "Qua 16 · 09:00": the class's school day (weekday capitalized) and its start time. */
const formatClassValue = (startsAt: string, locale: ReturnType<typeof getDateLocale>) => {
  const isoDay = schoolDayOf(startsAt);
  // The first three letters of the full name: date-fns' own "EEE" spells out "Quarta" in pt-BR.
  const weekday = formatIsoDate(isoDay, "EEEE", locale).slice(0, 3);

  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatIsoDate(isoDay, "d", locale)} · ${schoolTimeOf(startsAt)}`;
};

export const useEnrolStudentScreen = (): UseEnrolStudentScreenResult => {
  const { t, i18n } = useTranslation();
  const alertMessage = useAlertMessage();
  const enrolMutation = useEnrolStudent();
  const addGuestMutation = useAddGuest();
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
  const [discipline, setDiscipline] = useState<DisciplineFilterValue>("all");
  const [step, setStep] = useState<EnrolStep>("who");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<EnrolMode>("student");
  const [guestName, setGuestName] = useState("");
  const [isGuestNameTouched, setIsGuestNameTouched] = useState(false);
  const phone = usePhoneNumberField();
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
      (discipline === "all" || item.discipline === discipline) &&
      !item.cancelledAt &&
      new Date(item.startsAt).getTime() > startedBefore,
  );
  const upcoming = visibleWeeks.items.filter(
    (item) => !item.cancelledAt && new Date(item.startsAt).getTime() > startedBefore,
  );
  const markedDates = [...new Set(upcoming.map((item) => schoolDayOf(item.startsAt)))];
  const selectedClass = dayItems.find((item) => item.id === selectedClassId);
  // A class is picked and it still has a free seat (a reload may have filled it).
  const freeClass =
    selectedClass && !isClassFull(selectedClass.seatsTaken, selectedClass.capacity)
      ? selectedClass
      : null;
  const trimmedGuestName = guestName.trim();
  const isGuestNameValid = isValid(trimmedGuestName, nameRules());
  // The person is ready: a picked student, or a valid trial name and number.
  const whoValue =
    mode === "student"
      ? (selectedStudent?.name ?? null)
      : isGuestNameValid && phone.isNumberValid
        ? trimmedGuestName
        : null;
  const isWhoDone = whoValue !== null;
  const classValue = freeClass ? formatClassValue(freeClass.startsAt, getDateLocale(i18n.language)) : null;
  const target =
    freeClass && mode === "student" && selectedStudent
      ? { student: selectedStudent, classId: freeClass.id }
      : null;
  const guestTarget =
    freeClass && mode === "trial" && isGuestNameValid && phone.isNumberValid
      ? {
          classId: freeClass.id,
          name: trimmedGuestName,
          whatsappNumber: phone.whatsappNumber,
        }
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

  const send = async ({
    request,
    done,
    errorKey,
    shouldReload,
    refetchClasses,
  }: {
    request: () => Promise<unknown>;
    done: string;
    errorKey: (error: unknown) => string | null;
    shouldReload: (error: unknown) => boolean;
    refetchClasses: () => void;
  }) => {
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;
    setIsSubmitting(true);

    try {
      await request();
      alertMessage.show(done);
      router.back();
    } catch (error) {
      const key = errorKey(error);

      if (key) {
        alertMessage.show(t(key));
      }

      if (shouldReload(error)) {
        setSelectedClassId(null);
        refetchClasses();
      }
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const submitStudent = ({ student, classId }: NonNullable<typeof target>) =>
    send({
      request: () => enrolMutation.mutateAsync({ classId, studentId: student.id }),
      done: t("enrolStudent.done", { name: student.name }),
      errorKey: getEnrolStudentErrorKey,
      shouldReload: shouldReloadEnrolClasses,
      refetchClasses: () => void visibleWeeks.refetch(),
    });

  const submitGuest = ({ classId, name, whatsappNumber }: NonNullable<typeof guestTarget>) =>
    send({
      request: () => addGuestMutation.mutateAsync({ classId, name, whatsappNumber }),
      done: t("enrolStudent.doneTrial", { name }),
      errorKey: getAddGuestErrorKey,
      shouldReload: shouldReloadAddGuestClasses,
      refetchClasses: () => void visibleWeeks.refetch(),
    });

  const submitAction = (() => {
    if (target) {
      return () => submitStudent(target);
    }

    return guestTarget ? () => submitGuest(guestTarget) : undefined;
  })();

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
    // Undefined until the person (a picked student, or a valid trial name and number) and a class with a free seat are set.
    submit: submitAction,
    discipline,
    selectDiscipline: setDiscipline,
    step,
    // The Aula step can't be reached before the person is ready.
    goToStep: (next) => {
      if (next === "who" || isWhoDone) {
        setStep(next);
      }
    },
    isWhoDone,
    isClassDone: freeClass !== null,
    whoValue,
    classValue,
    isSubmitting,
    mode,
    setMode,
    guestName,
    setGuestName,
    guestNameStatus: getStatus(trimmedGuestName, isGuestNameValid, isGuestNameTouched),
    touchGuestName: () => setIsGuestNameTouched(true),
    phone,
  };
};
