export type ClassToolsDeleteState = "available" | "started" | "enrolled";

export type ClassToolsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** "Editar aula": the sheet closes first. */
  onEdit: () => void;
  /** "Enviar mensagem": the sheet closes first. */
  onNotify: () => void;
  /** "Cancelar aula": the sheet closes first. */
  onCancel: () => void;
  /** "Excluir aula": the sheet closes first. */
  onDelete: () => void;
  /** Who a message or a cancellation reaches: the other instructors, the students and the pending requests. */
  messageCount: number;
  /** Only a class that hasn't started and has nobody in it can be deleted. */
  deleteState: ClassToolsDeleteState;
};

export type UseClassToolsSheetProps = Pick<
  ClassToolsSheetProps,
  | "onClose"
  | "onEdit"
  | "onNotify"
  | "onCancel"
  | "onDelete"
  | "messageCount"
  | "deleteState"
>;
