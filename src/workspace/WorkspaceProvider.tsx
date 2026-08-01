import { createContext, useCallback, useContext, useMemo, useReducer, ReactNode } from "react";
import { toTabTitleCase } from "@/lib/tabTitle";

/** Maximum number of *content* windows (the pinned home tab does not count). */
export const MAX_TABS = 10;

export const HOME_TAB_ID = "tab_home";
export const HOME_TAB_TITLE = "Inicial";

export interface WorkspaceTab {
  id: string;
  path: string;
  title: string;
  /** Pinned tabs are permanent: always first, never closable. */
  pinned?: boolean;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeId: string | null;
  homePath: string;
}

type Action =
  | { type: "OPEN"; path: string; title: string }
  | { type: "OPEN_OR_ACTIVATE"; path: string; title: string }
  | { type: "CLOSE"; id: string }
  | { type: "CLOSE_OTHERS"; id: string }
  | { type: "CLOSE_ALL" }
  | { type: "ACTIVATE"; id: string };

function newId() {
  return `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function makeHomeTab(homePath: string): WorkspaceTab {
  return { id: HOME_TAB_ID, path: homePath, title: HOME_TAB_TITLE, pinned: true };
}

/**
 * Guarantees the pinned home tab exists exactly once, sits at index 0 and
 * that every title follows the Title Case standard. Used on init and whenever
 * persisted/rehydrated state is loaded.
 */
export function normalizeTabs(tabs: WorkspaceTab[], homePath: string): WorkspaceTab[] {
  const home = makeHomeTab(homePath);
  const rest = tabs
    .filter((t) => t.id !== HOME_TAB_ID && !t.pinned && t.path !== homePath)
    .map((t) => ({ ...t, pinned: false, title: toTabTitleCase(t.title) }))
    .slice(0, MAX_TABS);
  return [home, ...rest];
}

export function countContentTabs(tabs: WorkspaceTab[]): number {
  return tabs.filter((t) => !t.pinned).length;
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "OPEN": {
      if (action.path === state.homePath) return { ...state, activeId: HOME_TAB_ID };
      if (countContentTabs(state.tabs) >= MAX_TABS) return state;
      const tab: WorkspaceTab = { id: newId(), path: action.path, title: toTabTitleCase(action.title) };
      return { ...state, tabs: [...state.tabs, tab], activeId: tab.id };
    }
    case "OPEN_OR_ACTIVATE": {
      if (action.path === state.homePath) return { ...state, activeId: HOME_TAB_ID };
      const existing = state.tabs.find((t) => t.path === action.path);
      if (existing) {
        if (state.activeId === existing.id) return state;
        return { ...state, activeId: existing.id };
      }
      if (countContentTabs(state.tabs) >= MAX_TABS) return state;
      const tab: WorkspaceTab = { id: newId(), path: action.path, title: toTabTitleCase(action.title) };
      return { ...state, tabs: [...state.tabs, tab], activeId: tab.id };
    }
    case "CLOSE": {
      const idx = state.tabs.findIndex((t) => t.id === action.id);
      if (idx === -1) return state;
      // The pinned home tab can never be closed (X, middle-click, shortcut or code).
      if (state.tabs[idx].pinned) return state;
      const nextTabs = state.tabs.filter((t) => t.id !== action.id);
      let nextActive = state.activeId;
      if (state.activeId === action.id) {
        nextActive = nextTabs[Math.max(0, idx - 1)]?.id ?? HOME_TAB_ID;
      }
      return { ...state, tabs: nextTabs, activeId: nextActive };
    }
    case "CLOSE_OTHERS": {
      const keep = state.tabs.filter((t) => t.pinned || t.id === action.id);
      return { ...state, tabs: keep, activeId: keep.some((t) => t.id === action.id) ? action.id : HOME_TAB_ID };
    }
    case "CLOSE_ALL": {
      const keep = state.tabs.filter((t) => t.pinned);
      return { ...state, tabs: keep, activeId: HOME_TAB_ID };
    }
    case "ACTIVATE":
      return state.tabs.some((t) => t.id === action.id) ? { ...state, activeId: action.id } : state;
    default:
      return state;
  }
}

interface WorkspaceContextValue extends WorkspaceState {
  openTab: (path: string, title: string) => void;
  openOrActivateTab: (path: string, title: string) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  activateTab: (id: string) => void;
  canOpenMore: boolean;
  max: number;
  contentCount: number;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

interface Props {
  initialPath: string;
  initialTitle: string;
  homePath?: string;
  children: ReactNode;
}

export function WorkspaceProvider({ initialPath, initialTitle, homePath = "/dashboard", children }: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const initialTabs: WorkspaceTab[] =
      initialPath === homePath
        ? []
        : [{ id: newId(), path: initialPath, title: toTabTitleCase(initialTitle) }];
    const tabs = normalizeTabs(initialTabs, homePath);
    return { tabs, activeId: tabs[tabs.length - 1].id, homePath };
  });

  const openTab = useCallback((path: string, title: string) => {
    dispatch({ type: "OPEN", path, title });
  }, []);
  const openOrActivateTab = useCallback((path: string, title: string) => {
    dispatch({ type: "OPEN_OR_ACTIVATE", path, title });
  }, []);
  const closeTab = useCallback((id: string) => dispatch({ type: "CLOSE", id }), []);
  const closeOtherTabs = useCallback((id: string) => dispatch({ type: "CLOSE_OTHERS", id }), []);
  const closeAllTabs = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);
  const activateTab = useCallback((id: string) => dispatch({ type: "ACTIVATE", id }), []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...state,
      openTab,
      openOrActivateTab,
      closeTab,
      closeOtherTabs,
      closeAllTabs,
      activateTab,
      canOpenMore: countContentTabs(state.tabs) < MAX_TABS,
      contentCount: countContentTabs(state.tabs),
      max: MAX_TABS,
    }),
    [state, openTab, openOrActivateTab, closeTab, closeOtherTabs, closeAllTabs, activateTab],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export { reducer as workspaceReducer };
