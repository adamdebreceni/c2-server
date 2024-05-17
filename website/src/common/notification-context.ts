import { createContext } from "react";

export const NotificationContext = createContext<{emit(msg: string, type: "success"|"error"):void}>({emit(){}});