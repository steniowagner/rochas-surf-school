import { Easing, FadeIn, FadeInDown } from "react-native-reanimated";

import type { DisciplineFilterValue } from "../../classes.types";

/**
 * The room the floating button takes above the bottom inset: its height (`h-14`) and its gap (`pb-4`). A list under it
 * adds this to its bottom padding, so its last item scrolls clear of the button.
 */
export const DISCIPLINE_FILTER_CLEARANCE = 56 + 16;

export const DISCIPLINE_FILTER_OPTIONS: DisciplineFilterValue[] = [
  "all",
  "surf",
  "skate",
];

// AGENDA-01B's motion. CSS `ease`, which Reanimated's `Easing.ease` is not.
const CSS_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
// The design's `cubic-bezier(.32,.72,0,1)`, for the options and the button's turn.
const SETTLE = Easing.bezier(0.32, 0.72, 0, 1);

/** The button turns to −90° while open, and back. */
export const BUTTON_TURN = { degrees: -90, duration: 200, easing: SETTLE };

/** The backdrop fades in when the options open; closing is instant, as in the design. */
export const BACKDROP_ENTERING = FadeIn.duration(180).easing(CSS_EASE);

/**
 * Each option rises 14px while fading in, 40ms after the one above it. One builder per option: a builder's methods
 * change it in place, so they can't share one.
 */
export const OPTION_ENTERING = DISCIPLINE_FILTER_OPTIONS.map((_, index) =>
  FadeInDown.withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
    .duration(220)
    .easing(SETTLE)
    .delay(index * 40),
);
