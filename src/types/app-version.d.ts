declare const __APP_VERSION__: string;

interface Window {
  /**
   * Registry of "is there unsaved form data?" checks.
   * Any component with a dirty state can register a predicate here so that
   * the app-update modal can warn the user before reloading the page.
   * Returning a non-empty string is treated as "dirty" and its value is
   * used as the warning label; returning `true` is a generic dirty state.
   */
  __appUpdateDirtyChecks?: Array<() => boolean | string>;
}