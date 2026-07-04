import { createContext, useCallback, useContext, useMemo, useReducer, ReactNode } from "react";

export const MAX_TABS = 10;

export interface WorkspaceTab {
  id: string;
  path: string;
  title: string;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeId: string | null;
}

type Action =
  | { type: "OPEN"; path: string; title: string }
  | { type: "CLOSE"; id: string }
  | { type: "ACTIVATE"; id: string }
  | { type: "RESET"; initial: WorkspaceTab };

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "OPEN": {
      if (state.tabs.length >= MAX_TABS) return state;
      const id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const tab: WorkspaceTab = { id, path: action.path, title: action.title };
      return { tabs: [...state.tabs, tab], activeId: id };
    }
    case "CLOSE": {
      const idx = state.tabs.findIndex((t) => t.id === action.id);
      if (idx === -1) return state;
      const nextTabs = state.tabs.filter((t) => t.id !== action.id);
      let nextActive = state.activeId;
      if (state.activeId === action.id) {
        nextActive = nextTabs[Math.max(0, idx - 1)]?.id ?? null;
      }
      return { tabs: nextTabs, activeId: nextActive };
    }
    case "ACTIVATE":
      return state.tabs.some((t) => t.id === action.id) ? { ...state, activeId: action.id } : state;
    case "RESET":
      return { tabs: [action.initial], activeId: action.initial.id };
    default:
      return state;
  }
}

interface WorkspaceContextValue extends WorkspaceState {
  openTab: (path: string, title: string) => void;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
  canOpenMore: boolean;
  max: number;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

interface Props {
  initialPath: string;
  initialTitle: string;
  children: ReactNode;
}

export function WorkspaceProvider({ initialPath, initialTitle, children }: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const id = `tab_init_${Math.random().toString(36).slice(2, 7)}`;
    return { tabs: [{ id, path: initialPath, title: initialTitle }], activeId: id };
  });

  const openTab = useCallback((path: string, title: string) => {
    dispatch({ type: "OPEN", path, title });
  }, []);
  const closeTab = useCallback((id: string) => dispatch({ type: "CLOSE", id }), []);
  const activateTab = useCallback((id: string) => dispatch({ type: "ACTIVATE", id }), []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...state,
      openTab,
      closeTab,
      activateTab,
      canOpenMore: state.tabs.length < MAX_TABS,
      max: MAX_TABS,
    }),
    [state, openTab, closeTab, activateTab],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}