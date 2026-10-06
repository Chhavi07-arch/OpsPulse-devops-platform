import { createContext, useContext } from "react";

export const ToastContext = createContext(() => {});

/** Returns notify(message, tone?) — tone is "success" | "error" | "info". */
export const useToast = () => useContext(ToastContext);
