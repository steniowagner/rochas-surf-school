export type ToastProps = {
  message: string;
  onHidden: () => void;
};

export type UseToastProps = Pick<ToastProps, "onHidden">;
