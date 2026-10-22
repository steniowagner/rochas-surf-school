export type ErrorStateProps = {
  title: string;
  description: string;
  /** Called by the "Try again" button. */
  onRetry: () => void;
  /** Shows the spinner in the button while the retry runs. */
  retrying?: boolean;
};
