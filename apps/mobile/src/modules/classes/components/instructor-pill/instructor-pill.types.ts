export type InstructorPillProps = {
  name: string;
  /** The signed-in viewer teaches the class: reads "You" with a `lagoon` border. */
  isViewer: boolean;
  onPress: () => void;
};
