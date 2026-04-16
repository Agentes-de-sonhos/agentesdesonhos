import { createContext, useContext, useState, type ReactNode } from "react";

interface EditModeContextValue {
  editMode: boolean;
  toggleEditMode: () => void;
}

const EditModeContext = createContext<EditModeContextValue>({
  editMode: false,
  toggleEditMode: () => {},
});

export function EditModeProvider({ children, defaultEnabled = false }: { children: ReactNode; defaultEnabled?: boolean }) {
  const [editMode, setEditMode] = useState(defaultEnabled);
  return (
    <EditModeContext.Provider value={{ editMode, toggleEditMode: () => setEditMode((v) => !v) }}>
      {children}
    </EditModeContext.Provider>
  );
}

export const useEditMode = () => useContext(EditModeContext);
