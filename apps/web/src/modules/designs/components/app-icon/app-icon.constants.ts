import {
  mdiAccountMinus,
  mdiAccountRemoveOutline,
  mdiClose,
  mdiCloseCircleOutline,
  mdiSendOutline,
  mdiSurfing,
} from "@mdi/js";
import type { IconType } from "react-icons";
import { GenIcon } from "react-icons/lib";
import {
  FaWhatsapp,
} from "react-icons/fa";
import { FaRegCircleUser } from "react-icons/fa6";
import { SlGraph } from "react-icons/sl";
import {
  FiArrowUpRight,
  FiCheck,
  FiHome,
  FiChevronRight,
  FiMail,
  FiMapPin,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import {
  IoAdd,
  IoAlertCircleOutline,
  IoArrowUndoOutline,
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoCheckmark,
  IoCheckmarkCircleOutline,
  IoCheckmarkOutline,
  IoChevronBack,
  IoFilter,
  IoChevronDown,
  IoChevronForward,
  IoChevronUp,
  IoCloseCircle,
  IoCloseCircleOutline,
  IoHourglassOutline,
  IoListOutline,
  IoLocationOutline,
  IoMoonOutline,
  IoNotificationsOutline,
  IoOptionsOutline,
  IoPersonOutline,
  IoPersonRemoveOutline,
  IoRefresh,
  IoRemoveCircleOutline,
  IoSearch,
  IoSunnyOutline,
  IoTicketOutline,
  IoTimeOutline,
} from "react-icons/io5";

// MaterialCommunityIcons draws 24-point glyphs from one path; `@mdi/js` has the same paths.
const mdi = (path: string): IconType =>
  GenIcon({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: path }, child: [] }] });

/**
 * The glyphs the app draws, by set and name as in `@expo/vector-icons`. Add a glyph here when a design needs it;
 * `.docs/designs/src/_shared/icons.js` draws the same ones.
 */
export const glyphs = {
  "Feather:arrow-up-right": FiArrowUpRight,
  "Feather:check": FiCheck,
  "Feather:chevron-right": FiChevronRight,
  "Feather:home": FiHome,
  "Feather:mail": FiMail,
  "Feather:map-pin": FiMapPin,
  "Feather:trash-2": FiTrash2,
  "Feather:user": FiUser,
  "Feather:users": FiUsers,
  "Feather:x": FiX,
  "Feather:x-circle": FiXCircle,
  "FontAwesome6:circle-user": FaRegCircleUser,
  "FontAwesome:whatsapp": FaWhatsapp,
  "MaterialCommunityIcons:account-minus": mdi(mdiAccountMinus),
  "MaterialCommunityIcons:account-remove-outline": mdi(mdiAccountRemoveOutline),
  "MaterialCommunityIcons:close": mdi(mdiClose),
  "MaterialCommunityIcons:close-circle-outline": mdi(mdiCloseCircleOutline),
  "MaterialCommunityIcons:send-outline": mdi(mdiSendOutline),
  "MaterialCommunityIcons:surfing": mdi(mdiSurfing),
  "SimpleLineIcons:graph": SlGraph,
  "Ionicons:add": IoAdd,
  "Ionicons:alert-circle-outline": IoAlertCircleOutline,
  "Ionicons:arrow-undo-outline": IoArrowUndoOutline,
  "Ionicons:calendar-clear-outline": IoCalendarClearOutline,
  "Ionicons:calendar-outline": IoCalendarOutline,
  "Ionicons:checkmark": IoCheckmark,
  "Ionicons:checkmark-circle-outline": IoCheckmarkCircleOutline,
  "Ionicons:checkmark-outline": IoCheckmarkOutline,
  "Ionicons:filter": IoFilter,
  "Ionicons:chevron-back": IoChevronBack,
  "Ionicons:chevron-down": IoChevronDown,
  "Ionicons:chevron-forward": IoChevronForward,
  "Ionicons:chevron-up": IoChevronUp,
  "Ionicons:close-circle": IoCloseCircle,
  "Ionicons:close-circle-outline": IoCloseCircleOutline,
  "Ionicons:hourglass-outline": IoHourglassOutline,
  "Ionicons:list-outline": IoListOutline,
  "Ionicons:location-outline": IoLocationOutline,
  "Ionicons:moon-outline": IoMoonOutline,
  "Ionicons:notifications-outline": IoNotificationsOutline,
  "Ionicons:options-outline": IoOptionsOutline,
  "Ionicons:person-outline": IoPersonOutline,
  "Ionicons:person-remove-outline": IoPersonRemoveOutline,
  "Ionicons:refresh": IoRefresh,
  "Ionicons:remove-circle-outline": IoRemoveCircleOutline,
  "Ionicons:search": IoSearch,
  "Ionicons:sunny-outline": IoSunnyOutline,
  "Ionicons:ticket-outline": IoTicketOutline,
  "Ionicons:time-outline": IoTimeOutline,
} as const satisfies Record<string, IconType>;
