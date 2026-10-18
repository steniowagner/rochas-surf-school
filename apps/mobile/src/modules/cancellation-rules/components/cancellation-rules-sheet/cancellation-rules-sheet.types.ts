export type CancellationRulesSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export type UseCancellationRulesSheetProps = Pick<CancellationRulesSheetProps, "visible">;
