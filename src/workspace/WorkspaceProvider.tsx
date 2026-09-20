import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { toTabTitleCase } from "@/lib/tabTitle";
import { isMultiInstanceRoute } from "./multiInstanceRoutes";
import { titleForPath } from "./routeTitle";
import {
  MAX_PINNED_TABS,
  buildPinnedStorageKey,
  isPinnablePath,
  normalizePinnedPath,
  readPinnedPaths,
  restorablePinnedPaths,
  togglePinnedPath,
  type TogglePinnedResult,
  writePinnedPaths,
  type PinnedScope,
} from "./pinnedTabs";

/** Maximum number of *content* windows (the pinned home tab does not count). */
export const MAX_TABS = 10;

export const HOME_TAB_ID = "tab_home";
export const HOME_TAB_TITLE = "Inicial";

export interface WorkspaceTab {
  id: string;
  path: string;
  title: string;
  /** Router `state` carried over from the originating navigation, if any. */
  state?: unknown;
  /** Pinned tabs are permanent: always first, never closable. */
  pinned?: boolean;
}

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeId: string | null;
  homePath: string;
  /** Caminhos das abas FAVORITAS (fixadas), na ordem salva. Máximo de 4. */
  pinnedPaths: string[];
}

type Action =
  | { type: "OPEN"; path: string; title: string; state?: unknown }
  | { type: "OPEN_OR_ACTIVATE"; path: string; title: string; state?: unknown }
  | { type: "CLOSE"; id: string }
  | { type: "CLOSE_OTHERS"; id: string }
  | { type: "CLOSE_ALL" }
  | { type: "ACTIVATE"; id: string }
  | { type: "SET_PINNED_PATHS"; paths: string[] }
  | { type: "RESTORE_PINNED"; paths: string[] };

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

/**
 * Janelas de criação podem ser abertas várias vezes; nesse caso numeramos o
 * título ("Orçamento 2") para o usuário distinguir as instâncias.
 */
function uniqueTitle(tabs: WorkspaceTab[], path: string, title: string): string {
  const base = toTabTitleCase(title);
  if (!isMultiInstanceRoute(path)) return base;
  const samePath = tabs.filter((t) => !t.pinned && t.path === path).length;
  return samePath === 0 ? base : `${base} ${samePath + 1}`;
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "OPEN": {
      if (action.path === state.homePath) return { ...state, activeId: HOME_TAB_ID };
      if (countContentTabs(state.tabs) >= MAX_TABS) return state;
      const tab: WorkspaceTab = { id: newId(), path: action.path, title: uniqueTitle(state.tabs, action.path, action.title), state: action.state };
      return { ...state, tabs: [...state.tabs, tab], activeId: tab.id };
    }
    case "OPEN_OR_ACTIVATE": {
      if (action.path === state.homePath) return { ...state, activeId: HOME_TAB_ID };
      const existing = isMultiInstanceRoute(action.path)
        ? undefined
        : state.tabs.find((t) => t.path === action.path);
      if (existing) {
        if (state.activeId === existing.id) return state;
        return { ...state, activeId: existing.id };
      }
      if (countContentTabs(state.tabs) >= MAX_TABS) return state;
      const tab: WorkspaceTab = { id: newId(), path: action.path, title: uniqueTitle(state.tabs, action.path, action.title), state: action.state };
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
    case "SET_PINNED_PATHS":
      return { ...state, pinnedPaths: action.paths.slice(0, MAX_PINNED_TABS) };
    case "RESTORE_PINNED": {
      // Restaura as abas fixadas logo após Inicial, na ordem salva, sem
      // duplicar as que já estão abertas e sem furar o limite de 10 janelas.
      const paths = restorablePinnedPaths(action.paths, {
        homePath: state.homePath,
        openPaths: state.tabs.map((t) => t.path),
      });
      let tabs = state.tabs;
      for (const path of paths) {
        if (countContentTabs(tabs) >= MAX_TABS) break;
        tabs = [...tabs, { id: newId(), path, title: titleForPath(path) }];
      }
      return { ...state, tabs, pinnedPaths: action.paths.slice(0, MAX_PINNED_TABS) };
    }
    default:
      return state;
  }
}

interface WorkspaceContextValue extends WorkspaceState {
  openTab: (path: string, title: string, state?: unknown) => void;
  openOrActivateTab: (path: string, title: string, state?: unknown) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  activateTab: (id: string) => void;
  canOpenMore: boolean;
  max: number;
  contentCount: number;
  /** Fixar/desfixar uma aba elegível (favoritos restaurados no próximo acesso). */
  togglePinnedTab: (id: string) => void;
  isTabPinned: (tab: WorkspaceTab) => boolean;
  isTabPinnable: (tab: WorkspaceTab) => boolean;
  maxPinned: number;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

interface Props {
  initialPath: string;
  initialTitle: string;
  homePath?: string;
  /**
   * Escopo das preferências de abas fixadas (produto + tenant + usuário).
   * Sem escopo (ou sem usuário) a fixação fica apenas na sessão atual.
   */
  pinnedScope?: PinnedScope;
  /** `true` quando os guards já carregaram e a restauração pode acontecer. */
  pinnedRestoreReady?: boolean;
  /** Valida rota/guards antes de restaurar uma aba fixada. */
  canRestorePinnedPath?: (path: string) => boolean;
  children: ReactNode;
}

export function WorkspaceProvider({
  initialPath,
  initialTitle,
  homePath = "/dashboard",
  pinnedScope,
  pinnedRestoreReady = true,
  canRestorePinnedPath,
  children,
}: Props) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const initialTabs: WorkspaceTab[] =
      initialPath === homePath
        ? []
        : [{ id: newId(), path: initialPath, title: toTabTitleCase(initialTitle) }];
    const tabs = normalizeTabs(initialTabs, homePath);
    return { tabs, activeId: tabs[tabs.length - 1].id, homePath, pinnedPaths: [] };
  });

  const storageKey = useMemo(
    () => (pinnedScope ? buildPinnedStorageKey(pinnedScope) : null),
    [pinnedScope?.product, pinnedScope?.tenant, pinnedScope?.userId],
  );

  const restoredKeyRef = useRef<string | null>(null);
  const guardRef = useRef(canRestorePinnedPath);
  guardRef.current = canRestorePinnedPath;

  // Restauração automática no primeiro acesso/recarregamento, por escopo.
  useEffect(() => {
    if (!storageKey || !pinnedRestoreReady) return;
    if (restoredKeyRef.current === storageKey) return;
    restoredKeyRef.current = storageKey;
    const saved = readPinnedPaths(storageKey, homePath);
    if (saved.length === 0) return;
    const allowed = saved.filter((path) => !guardRef.current || guardRef.current(path));
    dispatch({ type: "SET_PINNED_PATHS", paths: saved });
    if (allowed.length > 0) dispatch({ type: "RESTORE_PINNED", paths: allowed });
  }, [storageKey, pinnedRestoreReady, homePath]);

  const openTab = useCallback((path: string, title: string, navState?: unknown) => {
    dispatch({ type: "OPEN", path, title, state: navState });
  }, []);
  const openOrActivateTab = useCallback((path: string, title: string, navState?: unknown) => {
    dispatch({ type: "OPEN_OR_ACTIVATE", path, title, state: navState });
  }, []);
  const closeTab = useCallback((id: string) => dispatch({ type: "CLOSE", id }), []);
  const closeOtherTabs = useCallback((id: string) => dispatch({ type: "CLOSE_OTHERS", id }), []);
  const closeAllTabs = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);
  const activateTab = useCallback((id: string) => dispatch({ type: "ACTIVATE", id }), []);

  const stateRef = useRef(state);
  stateRef.current = state;

  const togglePinnedTab = useCallback(
    (id: string) => {
      const current = stateRef.current;
      const tab = current.tabs.find((t) => t.id === id);
      if (!tab || tab.pinned) return;
      const result: TogglePinnedResult = togglePinnedPath(
        current.pinnedPaths,
        tab.path,
        current.homePath,
      );
      if (result.ok === false) {
        toast.error(
          result.reason === "limit"
            ? `Você pode manter até ${MAX_PINNED_TABS} abas fixadas além da Inicial. Desfixe uma para fixar outra.`
            : "Esta aba não pode ser fixada.",
        );
        return;
      }
      dispatch({ type: "SET_PINNED_PATHS", paths: result.paths });
      // Persistência imediata: fechar a aba depois não desfixa a preferência.
      writePinnedPaths(storageKey, result.paths);
      toast.success(result.pinned ? `"${tab.title}" fixada.` : `"${tab.title}" desfixada.`);
    },
    [storageKey],
  );

  const isTabPinned = useCallback(
    (tab: WorkspaceTab) =>
      !tab.pinned && state.pinnedPaths.includes(normalizePinnedPath(tab.path)),
    [state.pinnedPaths],
  );

  const isTabPinnable = useCallback(
    (tab: WorkspaceTab) => !tab.pinned && isPinnablePath(tab.path, state.homePath),
    [state.homePath],
  );

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
      togglePinnedTab,
      isTabPinned,
      isTabPinnable,
      maxPinned: MAX_PINNED_TABS,
    }),
    [
      state,
      openTab,
      openOrActivateTab,
      closeTab,
      closeOtherTabs,
      closeAllTabs,
      activateTab,
      togglePinnedTab,
      isTabPinned,
      isTabPinnable,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export { reducer as workspaceReducer };
