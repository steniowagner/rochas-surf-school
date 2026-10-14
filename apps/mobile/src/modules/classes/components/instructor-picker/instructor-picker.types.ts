import { Teacher } from "../../classes.types";

export type InstructorPickerProps = {
  teachers: Teacher[];
  loading: boolean;
  error: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onRetry: () => void;
};
