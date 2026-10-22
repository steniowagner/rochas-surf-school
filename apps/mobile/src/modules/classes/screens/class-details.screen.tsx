import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContactSchoolButton } from "@/components/contact-school-button";
import { Button } from "@/components/ui/button";
import { HeaderButton } from "@/components/ui/header-button";
import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";
import { CancellationRulesSheet } from "@/modules/cancellation-rules/components/cancellation-rules-sheet";
import { CancelSeatSheet } from "@/modules/enrolment/components/cancel-seat-sheet";
import { DenialReasonSheet } from "@/modules/enrolment/components/denial-reason-sheet";
import { RequestSeatSheet } from "@/modules/enrolment/components/request-seat-sheet";
import { TakeOutSheet } from "@/modules/enrolment/components/take-out-sheet";
import { WithdrawRequestSheet } from "@/modules/enrolment/components/withdraw-request-sheet";
import { BANNER_CLASSES } from "@/modules/enrolment/utils/enrolment-status";
import { PersonSheet } from "@/modules/people/components/person-sheet";

import { CancelClassSheet } from "../components/cancel-class-sheet";
import { ClassLocationCard } from "../components/class-location-card";
import { ClassPeople } from "../components/class-people";
import { ClassRuleRow } from "../components/class-rule-row";
import { ClassToolsSheet } from "../components/class-tools-sheet";
import { DeleteClassSheet } from "../components/delete-class-sheet";

import { useClassDetailsScreen } from "./class-details.screen.hook";
import type { ClassDetailsScreenProps } from "./class-details.screen.types";

export function ClassDetailsScreen({
  canEdit = false,
  canEnrol = false,
}: ClassDetailsScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useClassDetailsScreen({ canEdit, canEnrol });
  const { item } = screen;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: screen.showTools
            ? () => (
                <HeaderButton
                  icon="construct-outline"
                  label={t("classDetails.tools")}
                  onPress={screen.openTools}
                />
              )
            : undefined,
        }}
      />
      <ScrollView
        className="flex-1 bg-page"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 pt-4 px-screen"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        {screen.isLoading ? (
          <ActivityIndicator
            testID="class-details-loading"
            color={theme.grape}
          />
        ) : screen.isNotFound ? (
          <Text className="ds-text-body text-center text-ink-2">
            {t("classDetails.notFound")}
          </Text>
        ) : screen.isError ? (
          <View className="items-center gap-3">
            <Text className="ds-text-body text-center text-ink-2">
              {t("classDetails.loadError")}
            </Text>
            <Button variant="outline" onPress={screen.retry}>
              {t("classDetails.retry")}
            </Button>
          </View>
        ) : item ? (
          <>
            <View className="gap-2">
              <View className="flex-row flex-wrap gap-2 mb-1">
                <Chip tone={item.discipline === "surf" ? "surf" : "skate"}>
                  {t(`newClass.discipline.${item.discipline}`)}
                </Chip>
                <Chip tone="info">{t(`newClass.level.${item.level}`)}</Chip>
              </View>
              <Text className="ds-text-list-title text-ink-2">
                {screen.dateLine}
              </Text>
              <Text className="ds-text-kpi text-ink">{screen.timeRange}</Text>
            </View>
            {screen.showNoInstructor ? (
              <Pressable
                accessibilityRole="button"
                onPress={screen.edit}
                className="min-h-11 flex-row items-center gap-3 rounded-card bg-warn-tint p-4"
              >
                <Ionicons
                  name="person-remove-outline"
                  size={24}
                  color={theme.ink}
                />
                <View className="flex-1 gap-1">
                  <Text className="ds-text-list-title text-ink">
                    {t("classDetails.noInstructor.title")}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {t("classDetails.noInstructor.description")}
                  </Text>
                </View>
              </Pressable>
            ) : null}
            {screen.showNoDeadline ? (
              <Pressable
                accessibilityRole="button"
                onPress={screen.openCancellationRules}
                className="min-h-11 flex-row items-center gap-3 rounded-card bg-warn-tint p-4"
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={24}
                  color={theme.ink}
                />
                <View className="flex-1 gap-1">
                  <Text className="ds-text-list-title text-ink">
                    {t("classDetails.noDeadline.title")}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {t("classDetails.noDeadline.description", {
                      discipline: t(
                        `cancellationRules.screen.discipline.${item.discipline}`,
                      ),
                    })}
                  </Text>
                </View>
              </Pressable>
            ) : null}
            {screen.state === "started" ? (
              <View className="gap-1 rounded-card bg-sun p-4">
                <Text className="ds-text-list-title text-on-color">
                  {t("classDetails.started.title")}
                </Text>
                <Text className="ds-text-list-subtitle text-on-color">
                  {t("classDetails.started.description", {
                    start: screen.start,
                    end: screen.end,
                  })}
                </Text>
              </View>
            ) : null}
            {screen.state === "cancelled" ? (
              <View className="flex-row items-center gap-3 rounded-card bg-bad-tint p-4">
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color={theme.bad}
                />
                <View className="flex-1 gap-1">
                  <Text className="ds-text-list-title text-ink">
                    {t("classDetails.cancelled.title")}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {item.cancellationMessage ??
                      t("classDetails.cancelled.description")}
                  </Text>
                </View>
              </View>
            ) : null}
            {screen.showFullBanner ? (
              <View className="flex-row items-center gap-3 rounded-card bg-bad-tint p-4">
                <Ionicons name="people-outline" size={24} color={theme.bad} />
                <View className="flex-1 gap-1">
                  <Text className="ds-text-list-title text-ink">
                    {t("classDetails.full.title")}
                  </Text>
                  {screen.enrolment.invitesWaitingList ? (
                    <Text className="ds-text-list-subtitle text-ink-2">
                      {t("classDetails.full.waitingList")}
                    </Text>
                  ) : null}
                  {screen.enrolment.waitingListClosed ? (
                    <Text className="ds-text-list-subtitle text-ink-2">
                      {t("classDetails.full.waitingListClosed")}
                    </Text>
                  ) : null}
                  {canEdit ? (
                    <Text className="ds-text-list-subtitle text-ink-2">
                      {t(
                        screen.waitingListEnabled
                          ? "classDetails.full.newRequestsWait"
                          : "classDetails.full.waitingListOff",
                      )}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
            {screen.enrolment.display ? (
              <Pressable
                accessibilityRole={
                  screen.enrolment.pressableDisplay ? "button" : undefined
                }
                disabled={!screen.enrolment.pressableDisplay}
                onPress={screen.enrolment.openDenial}
                className={`flex-row items-center gap-3 rounded-card p-4 ${BANNER_CLASSES[screen.enrolment.display.tone]}`}
              >
                <Ionicons
                  name={screen.enrolment.display.icon}
                  size={24}
                  color={
                    theme[
                      screen.enrolment.display.tone === "bad"
                        ? "bad"
                        : screen.enrolment.display.tone === "ok"
                          ? "ok"
                          : "ink"
                    ]
                  }
                />
                <View className="flex-1 gap-1">
                  <Text className="ds-text-list-title text-ink">
                    {t(
                      `enrolment.status.${screen.enrolment.display.key}.title`,
                    )}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {screen.enrolmentDescription}
                  </Text>
                </View>
              </Pressable>
            ) : null}
            {screen.state === "finished" ? (
              <View className="gap-1 rounded-card bg-dim p-4">
                <Text className="ds-text-list-title text-ink">
                  {t("classDetails.finished.title")}
                </Text>
                <Text className="ds-text-list-subtitle text-ink-2">
                  {t("classDetails.finished.description", { end: screen.end })}
                </Text>
              </View>
            ) : null}
            <ClassPeople
              instructors={screen.instructors}
              students={item.students}
              guests={item.guests}
              showTrialCount={canEdit}
              seatsTaken={item.seatsTaken}
              capacity={item.capacity}
              state={screen.peopleState}
              onOpenInstructor={screen.openInstructor}
              onOpenStudent={screen.openStudent}
              onTakeOut={
                screen.canTakeOut
                  ? (student) =>
                      screen.takeOut.open({
                        name: student.name,
                        enrolmentId: student.enrolmentId,
                      })
                  : undefined
              }
              onTakeGuestOut={
                screen.canTakeOut
                  ? (guest) =>
                      screen.takeGuestOut.open({
                        name: guest.name ?? t("classDetails.trialChip"),
                        guestId: guest.id,
                      })
                  : undefined
              }
            />
            {screen.readOnlyNoteKey ? (
              <View className="flex-row items-center gap-3 rounded-card bg-dim p-4">
                <Ionicons name="eye-outline" size={20} color={theme.ink2} />
                <Text className="ds-text-list-subtitle flex-1 text-ink-2">
                  {t(screen.readOnlyNoteKey)}
                </Text>
              </View>
            ) : null}
            {screen.showRules ? (
              <View className="gap-2">
                <Text className="ds-text-section-label text-ink-2">
                  {t("classDetails.rules.title")}
                </Text>
                <View className="overflow-hidden rounded-card border border-line bg-surface">
                  <ClassRuleRow
                    icon="calendar-outline"
                    title={t("classDetails.rules.cancellation")}
                    value={
                      screen.cancellationDeadline
                        ? t("classDetails.rules.until", {
                            when: screen.cancellationDeadline,
                          })
                        : t("classDetails.rules.read")
                    }
                    onPress={screen.openRules}
                  />
                  <View className="h-px bg-line" />
                  <ClassRuleRow
                    icon="shield-outline"
                    title={t("classDetails.rules.school")}
                    value={screen.schoolRulesValue}
                    onPress={screen.openSchoolRules}
                  />
                </View>
              </View>
            ) : null}
            {item.notes ? (
              <View className="gap-2">
                <Text className="ds-text-section-label text-ink-2">
                  {t("classDetails.notes")}
                </Text>
                <View className="flex-row gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
                  <View className="pt-1">
                    <Ionicons name="reader-outline" size={17} color={theme.lagoon} />
                  </View>
                  <Text className="ds-text-body flex-1 text-ink">{item.notes}</Text>
                </View>
              </View>
            ) : null}
            <View className="gap-2">
              <Text className="ds-text-section-label text-ink-2">
                {t("classDetails.location")}
              </Text>
              <ClassLocationCard
                name={item.location.name}
                address={item.location.address}
                point={screen.locationPoint}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
      {screen.enrolment.cta || screen.enrolment.deadlineNote ? (
        <View
          className="gap-3 border-t border-line bg-page px-screen pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {screen.enrolment.cta ? (
            <Button
              variant={screen.enrolment.cta.variant}
              loading={screen.enrolment.ctaLoading}
              onPress={screen.enrolment.pressCta}
            >
              {t(`enrolment.cta.${screen.enrolment.cta.key}`)}
            </Button>
          ) : null}
          {screen.enrolment.deadlineNote ? (
            <>
              <Text className="ds-text-list-subtitle text-ink-2">
                {t(
                  `enrolment.cancelSeatNote.${screen.enrolment.deadlineNote}`,
                  {
                    deadline: screen.cancellationDeadline,
                  },
                )}
              </Text>
              <ContactSchoolButton />
            </>
          ) : null}
        </View>
      ) : null}
      {item && canEnrol ? (
        <>
          <RequestSeatSheet
            visible={screen.enrolment.requestVisible}
            loading={screen.enrolment.requesting}
            waitingList={screen.enrolment.waitingList}
            summary={screen.requestSummary}
            discipline={item.discipline}
            deadline={screen.cancellationDeadline}
            onConfirm={screen.enrolment.request}
            onClose={screen.enrolment.closeRequest}
          />
          <DenialReasonSheet
            visible={screen.enrolment.denialVisible}
            discipline={item.discipline}
            level={item.level}
            start={screen.start}
            reason={screen.enrolment.denialReason}
            onClose={screen.enrolment.closeDenial}
          />
          {screen.cancellationDeadline ? (
            <CancelSeatSheet
              visible={screen.enrolment.cancelVisible}
              loading={screen.enrolment.cancelling}
              deadline={screen.cancellationDeadline}
              onConfirm={screen.enrolment.cancel}
              onClose={screen.enrolment.closeCancel}
            />
          ) : null}
          <WithdrawRequestSheet
            visible={screen.enrolment.withdrawVisible}
            loading={screen.enrolment.withdrawing}
            onConfirm={screen.enrolment.withdraw}
            onClose={screen.enrolment.closeWithdraw}
          />
        </>
      ) : null}
      {screen.canTakeOut ? (
        <>
          <TakeOutSheet
            trial
            visible={screen.takeGuestOut.target !== null}
            firstName={screen.takeGuestOut.target?.name ?? ""}
            summary={screen.takeOutSummary}
            loading={screen.takeGuestOut.isPending}
            onConfirm={screen.takeGuestOut.confirm}
            onClose={screen.takeGuestOut.close}
          />
          <TakeOutSheet
            visible={screen.takeOut.target !== null}
            firstName={screen.takeOutFirstName}
            summary={screen.takeOutSummary}
            loading={screen.takeOut.isPending}
            onConfirm={screen.takeOut.confirm}
            onClose={screen.takeOut.close}
          />
        </>
      ) : null}
      <ClassToolsSheet
        visible={screen.toolsVisible}
        onClose={screen.closeTools}
        onEdit={screen.edit}
        onCancel={screen.openCancel}
        onDelete={screen.openDelete}
        canDelete={screen.canDelete}
      />
      <DeleteClassSheet
        visible={screen.deleteVisible}
        variant={screen.deleteVariant}
        classLine={screen.classLine}
        loading={screen.deleting}
        onConfirm={screen.remove}
        onCancelInstead={screen.cancelInstead}
        onClose={screen.closeDelete}
      />
      <PersonSheet
        person={screen.selectedPerson}
        visible={screen.personVisible}
        onClose={screen.closePerson}
      />
      <CancellationRulesSheet
        visible={screen.rulesVisible}
        onClose={screen.closeRules}
      />
      <CancelClassSheet
        visible={screen.cancelVisible}
        loading={screen.cancelling}
        guestCount={screen.guestCount}
        studentCount={screen.studentCount}
        pendingCount={screen.pendingCount}
        instructorCount={screen.instructorCount}
        onConfirm={screen.cancel}
        onClose={screen.closeCancel}
      />
    </>
  );
}
