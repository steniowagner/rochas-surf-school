export type ClassToolsDeleteState = "available" | "started" | "enrolled";

export type ClassToolsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** "Editar aula": the sheet closes first. */
  onEdit: () => void;
  /** "Enviar mensagem": the sheet closes first, then the message to this class opens (spec 069). */
  onNotify: () => void;
  /** "Cancelar aula": the sheet closes first. */
  onCancel: () => void;
  /** "Excluir aula": the sheet closes first. */
  onDelete: () => void;
  /**
   * Who a message or a cancellation reaches: the instructors, the students and the pending requests, each person once
   * and never the admin who sends it (spec 069, D-07).
   */
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
