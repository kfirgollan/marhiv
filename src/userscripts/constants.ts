// Shared identifiers for the custom-scripts feature, in their own module so the
// background worker can read them without importing the plugin (which pulls in
// React + the editor — code that has no place in a service worker).

// The custom-scripts plugin's id (its enabled-state storage key). The plugin is
// the master switch: the background worker only registers user scripts while it's
// enabled.
export const CUSTOM_SCRIPTS_PLUGIN_ID = 'custom-scripts'

// Must mirror the plugin's `meta.defaultEnabled`, so the worker computes the same
// enabled state the Plugin Manager does before the user has toggled anything.
export const CUSTOM_SCRIPTS_DEFAULT_ENABLED = false

// chrome.userScripts registration id for a given user script.
export const userScriptRegistrationId = (scriptId: string): string => `marhiv-script-${scriptId}`
