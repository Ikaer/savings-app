/**
 * Must be imported before anything that touches `@/lib/*`.
 *
 * Two things have to happen first:
 *  1. stdout has to be reserved for the JSON-RPC stream. `lib/data.ts` mirrors
 *     every read/write to `console.log`, which would corrupt it.
 *  2. DATA_PATH / LOGS_PATH have to be in `process.env` before `lib/savings.ts`
 *     is evaluated — it reads them into module-level consts. Next.js normally
 *     loads `.env.local` for us; standalone we do it ourselves.
 */
import fs from 'fs';
import path from 'path';

// 1. Anything the app logs goes to stderr, where MCP clients surface it as
//    server logs instead of feeding it to the protocol parser.
const toStderr = (...args: unknown[]) => {
    process.stderr.write(args.map(a => (typeof a === 'string' ? a : String(a))).join(' ') + '\n');
};
console.log = toStderr;
console.info = toStderr;
console.debug = toStderr;
console.warn = toStderr;

// 2. Minimal `.env` reader — deliberately dependency-free so the server does not
//    rely on Next's internals. Existing process env always wins.
function loadEnvFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return;

    for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const separator = line.indexOf('=');
        if (separator === -1) continue;

        const key = line.slice(0, separator).trim();
        if (!key || process.env[key] !== undefined) continue;

        let value = line.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        process.env[key] = value;
    }
}

const projectRoot = process.env.SAVINGS_PROJECT_ROOT || process.cwd();
loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

export const dataPath = process.env.DATA_PATH || '/app/data';
