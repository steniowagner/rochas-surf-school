export type ToastTone = "success" | "error";

export type ToastProps = {
  message: string;
  tone?: ToastTone;
  onHidden: () => void;
};

export type UseToastProps = Pick<ToastProps, "onHidden">;
