/**
 * Plugin Loader for Yuzuki MD
 * Dynamically discovers and loads Yuzuki-style plugins from src/plugins/.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, "../plugins");

const pluginStore = {
  commands: new Map(),     // cmdName -> { config, handler }
  aliases: new Map(),      // alias -> cmdName
  categories: new Map(),   // category -> [{ config, handler }]
  answerHandlers: [],      // Array of answerHandlers
};

let loaded = false;

/**
 * Recursively scan plugin directories and load all .js files.
 */
export async function loadPlugins() {
  if (loaded) return pluginStore;

  const categories = fs.readdirSync(PLUGINS_DIR).filter((f) => {
    const p = path.join(PLUGINS_DIR, f);
    return fs.statSync(p).isDirectory();
  });

  for (const category of categories) {
    const catPath = path.join(PLUGINS_DIR, category);
    const files = fs.readdirSync(catPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(catPath, file);
      try {
        const mod = await import(pathToFileURL(filePath).href);
        if (!mod.config || typeof mod.handler !== "function") {
          console.log(`[plugin-loader] Skip ${file} (missing config/handler)`);
          continue;
        }

        const config = { ...mod.config };
        config.category = config.category || category;
        const plugin = { config, handler: mod.handler };
        
        if (typeof mod.answerHandler === "function") {
          pluginStore.answerHandlers.push(mod.answerHandler);
        }

        // Register by name
        pluginStore.commands.set(config.name.toLowerCase(), plugin);

        // Register aliases
        const aliases = Array.isArray(config.alias) ? config.alias : [];
        for (const alias of aliases) {
          pluginStore.aliases.set(alias.toLowerCase(), config.name.toLowerCase());
        }

        // Register by category
        if (!pluginStore.categories.has(config.category)) {
          pluginStore.categories.set(config.category, []);
        }
        pluginStore.categories.get(config.category).push(plugin);
      } catch (err) {
        console.error(`[plugin-loader] Failed to load ${file}:`, err.message);
      }
    }
  }

  const total = pluginStore.commands.size;
  const cats = pluginStore.categories.size;
  console.log(`[plugin-loader] Loaded ${total} plugins across ${cats} categories`);
  loaded = true;
  return pluginStore;
}

/**
 * Look up a plugin by command name or alias.
 */
export function getPlugin(name) {
  const cmd = name.toLowerCase().trim();
  // Direct match
  if (pluginStore.commands.has(cmd)) {
    return pluginStore.commands.get(cmd);
  }
  // Alias match
  const resolved = pluginStore.aliases.get(cmd);
  if (resolved) {
    return pluginStore.commands.get(resolved);
  }
  return null;
}

/**
 * Get all plugins in a category.
 */
export function getPluginsByCategory(category) {
  return pluginStore.categories.get(category) || [];
}

/**
 * Get all loaded plugin names for menu listing.
 */
export function getAllPluginCommands() {
  const cmds = [];
  for (const [name, plugin] of pluginStore.commands) {
    cmds.push({ name, category: plugin.config.category, description: plugin.config.description });
  }
  return cmds;
}

/**
 * Get plugin stats.
 */
export function getPluginStats() {
  return {
    total: pluginStore.commands.size,
    categories: Array.from(pluginStore.categories.keys()),
  };
}

export function getAnswerHandlers() {
  return pluginStore.answerHandlers;
}
