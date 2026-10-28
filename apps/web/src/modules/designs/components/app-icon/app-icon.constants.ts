import type { IconType } from "react-icons";
import {
  FaWhatsapp,
} from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import {
  FiArrowUpRight,
  FiChevronRight,
  FiMail,
  FiMapPin,
  FiTrash2,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import {
  IoAlertCircleOutline,
  IoArrowUndoOutline,
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoCheckmark,
  IoCheckmarkCircleOutline,
  IoCheckmarkOutline,
  IoChevronBack,
  IoChevronDown,
  IoCloseCircle,
  IoCloseCircleOutline,
  IoHourglassOutline,
  IoListOutline,
  IoLocationOutline,
  IoNotificationsOutline,
  IoPersonOutline,
  IoPersonRemoveOutline,
  IoRefresh,
  IoRemoveCircleOutline,
  IoSearch,
  IoTicketOutline,
  IoTimeOutline,
} from "react-icons/io5";

/**
 * The glyphs the app draws, by set and name as in `@expo/vector-icons`. Add a glyph here when a design needs it;
 * `.docs/designs/src/_shared/icons.js` draws the same ones.
 */
export const glyphs = {
  "Feather:arrow-up-right": FiArrowUpRight,
  "Feather:chevron-right": FiChevronRight,
  "Feather:mail": FiMail,
  "Feather:map-pin": FiMapPin,
  "Feather:trash-2": FiTrash2,
  "Feather:users": FiUsers,
  "Feather:x": FiX,
  "Feather:x-circle": FiXCircle,
  "FontAwesome6:circle-user": FaRegCircleUser,
  "FontAwesome:whatsapp": FaWhatsapp,
  "Ionicons:alert-circle-outline": IoAlertCircleOutline,
  "Ionicons:arrow-undo-outline": IoArrowUndoOutline,
  "Ionicons:calendar-clear-outline": IoCalendarClearOutline,
  "Ionicons:calendar-outline": IoCalendarOutline,
  "Ionicons:checkmark": IoCheckmark,
  "Ionicons:checkmark-circle-outline": IoCheckmarkCircleOutline,
  "Ionicons:checkmark-outline": IoCheckmarkOutline,
  "Ionicons:chevron-back": IoChevronBack,
  "Ionicons:chevron-down": IoChevronDown,
  "Ionicons:close-circle": IoCloseCircle,
  "Ionicons:close-circle-outline": IoCloseCircleOutline,
  "Ionicons:hourglass-outline": IoHourglassOutline,
  "Ionicons:list-outline": IoListOutline,
  "Ionicons:location-outline": IoLocationOutline,
  "Ionicons:notifications-outline": IoNotificationsOutline,
  "Ionicons:person-outline": IoPersonOutline,
  "Ionicons:person-remove-outline": IoPersonRemoveOutline,
  "Ionicons:refresh": IoRefresh,
  "Ionicons:remove-circle-outline": IoRemoveCircleOutline,
  "Ionicons:search": IoSearch,
  "Ionicons:ticket-outline": IoTicketOutline,
  "Ionicons:time-outline": IoTimeOutline,
} as const satisfies Record<string, IconType>;
