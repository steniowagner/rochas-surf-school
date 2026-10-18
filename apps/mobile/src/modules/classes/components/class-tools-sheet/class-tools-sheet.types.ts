export type ClassToolsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** "Editar aula": the sheet closes first. */
  onEdit: () => void;
  /** "Cancelar aula": the sheet closes first. */
  onCancel: () => void;
  /** "Excluir aula": the sheet closes first. */
  onDelete: () => void;
  /** Only a class that hasn't started can be deleted. */
  canDelete: boolean;
};

export type UseClassToolsSheetProps = Pick<
  ClassToolsSheetProps,
  "onClose" | "onEdit" | "onCancel" | "onDelete"
>;
