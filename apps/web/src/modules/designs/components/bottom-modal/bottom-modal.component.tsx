import type { BottomModalProps } from "./bottom-modal.types";

/** A sheet open over a screen: the scrim fills the frame it is placed in, the sheet rises from its bottom. */
export function BottomModal({ children }: BottomModalProps) {
  return (
    <div data-testid="bottom-modal-scrim" className="absolute inset-0 z-10 flex items-end bg-scrim">
      <div role="dialog" className="w-full rounded-t-sheet bg-page px-5 pb-5.5 pt-2.5">
        <div data-testid="bottom-modal-handle" className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
        {children}
      </div>
    </div>
  );
}
