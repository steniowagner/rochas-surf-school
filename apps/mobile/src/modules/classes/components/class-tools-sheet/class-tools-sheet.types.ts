export type ClassToolsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** "Editar aula": the sheet closes first. */
  onEdit: () => void;
  /** "Cancelar aula": the sheet closes first. */
  onCancel: () => void;
};

export type UseClassToolsSheetProps = Pick<
  ClassToolsSheetProps,
  "onClose" | "onEdit" | "onCancel"
>;
