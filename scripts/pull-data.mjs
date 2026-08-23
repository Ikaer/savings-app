/**
 * Mirrors the SavingsTracker data directory from the Synology share into the
 * local DATA_PATH used for development.
 *
 * This is an exact mirror: files present at the destination but not at the
 * source are DELETED. Pass --dry-run to see what would change first.
 *
 * Overridable via CLI: --source=<path>, --dest=<path> (these win over env).
 * Overridable via env: SYNO_DATA_PATH (source), DATA_PATH (destination).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SOURCE = '\\\\Syno\\root4\\AppData\\SavingsTracker\\data';
const DEFAULT_DESTINATION = 'E:\\Workspace\\local\\SavingsTracker\\data';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

/** Reads a `--name=value` CLI flag; returns undefined when absent. */
function readFlag(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

/** Minimal `.env.local` reader — the project has no dotenv dependency. */
async function readEnvFile(filePath) {
  let contents;
  try {
    contents = await fs.readFile(filePath, 'utf8');
  } catch {
    return {};
  }

  const env = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    env[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }
  return env;
}

/**
 * Removes destination entries that have no counterpart of the same kind at the
 * source. Runs before the copy so existing files stay readable until they are
 * overwritten. Returns the paths removed.
 */
async function collectAndRemoveExtras(sourceDir, destinationDir, removed = []) {
  let entries;
  try {
    entries = await fs.readdir(destinationDir, { withFileTypes: true });
  } catch {
    return removed; // destination does not exist yet — nothing to prune
  }

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    let sourceStats = null;
    try {
      sourceStats = await fs.stat(sourcePath);
    } catch {
      // missing at source
    }

    const matches = sourceStats !== null && sourceStats.isDirectory() === entry.isDirectory();
    if (!matches) {
      removed.push(destinationPath);
      if (!dryRun) {
        await fs.rm(destinationPath, { recursive: true, force: true });
      }
      continue;
    }

    if (entry.isDirectory()) {
      await collectAndRemoveExtras(sourcePath, destinationPath, removed);
    }
  }

  return removed;
}

async function countFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true, recursive: true });
  return entries.filter((entry) => entry.isFile()).length;
}

async function main() {
  const fileEnv = await readEnvFile(path.join(projectRoot, '.env.local'));

  const source = readFlag('source') || process.env.SYNO_DATA_PATH || DEFAULT_SOURCE;
  const destination =
    readFlag('dest') || process.env.DATA_PATH || fileEnv.DATA_PATH || DEFAULT_DESTINATION;

  console.log(`Source:      ${source}`);
  console.log(`Destination: ${destination}`);
  if (dryRun) console.log('Mode:        dry run (nothing will be written or deleted)');

  try {
    const stats = await fs.stat(source);
    if (!stats.isDirectory()) {
      throw new Error(`${source} is not a directory`);
    }
  } catch (error) {
    console.error(`\nCannot read ${source} — is the network share reachable?`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }

  const removed = await collectAndRemoveExtras(source, destination);
  if (removed.length > 0) {
    console.log(`\n${dryRun ? 'Would delete' : 'Deleted'} ${removed.length} entry/entries not present at the source:`);
    for (const entry of removed) {
      console.log(`  - ${entry}`);
    }
  }

  if (!dryRun) {
    await fs.cp(source, destination, { recursive: true, force: true });
  }

  const fileCount = await countFiles(source);
  console.log(`\n${dryRun ? 'Would mirror' : 'Mirrored'} ${fileCount} file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
