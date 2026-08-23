import { getAllSavingsAccounts } from '@/lib/savings';
import { ACCOUNT_TYPE_LABELS, AccountType, SavingsAccount } from '@/models/savings';

/** MCP tool result carrying a JSON payload as text. */
export function jsonResult(data: unknown) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Resolve an account from an id, an exact name, or a partial name — callers are
 * language models, so they will often pass "my PEA" rather than the id.
 */
export function resolveAccount(reference: string): SavingsAccount {
    const accounts = getAllSavingsAccounts();
    const needle = reference.trim().toLowerCase();

    const match =
        accounts.find(a => a.id.toLowerCase() === needle) ??
        accounts.find(a => a.name.toLowerCase() === needle) ??
        accounts.find(a => a.type.toLowerCase() === needle) ??
        accounts.find(a => a.name.toLowerCase().includes(needle));

    if (!match) {
        const known = accounts.map(a => `${a.name} [id: ${a.id}, type: ${a.type}]`).join('; ');
        throw new Error(
            `No account matches "${reference}". Known accounts: ${known || '(none)'}. Call list_accounts first.`
        );
    }
    return match;
}

/** Reject an account whose type does not track the requested kind of record. */
export function requireAccountType(account: SavingsAccount, allowed: AccountType[], hint: string): void {
    if (allowed.includes(account.type)) return;

    const allowedLabels = allowed.map(t => ACCOUNT_TYPE_LABELS[t]).join(', ');
    throw new Error(
        `"${account.name}" is a ${ACCOUNT_TYPE_LABELS[account.type]} account; this data only exists for ${allowedLabels} accounts. ${hint}`
    );
}

/** Inclusive YYYY-MM-DD range check. Accepts plain dates and ISO timestamps. */
export function withinRange(value: string, from?: string, to?: string): boolean {
    const day = value.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
}

export type Granularity = 'all' | 'daily' | 'weekly' | 'monthly';

function periodKey(day: string, granularity: Granularity): string {
    if (granularity === 'monthly') return day.slice(0, 7);
    if (granularity === 'daily') return day;

    // Weekly: bucket by the Monday of the record's ISO week.
    const date = new Date(`${day}T00:00:00Z`);
    const offset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
}

/**
 * Snapshot series can hold several records per day; keep the last one of each
 * bucket so a multi-year history stays small enough to reason about.
 * Assumes `records` is sorted oldest first.
 */
export function downsample<T>(records: T[], getDate: (record: T) => string, granularity: Granularity): T[] {
    if (granularity === 'all') return records;

    const buckets = new Map<string, T>();
    for (const record of records) {
        buckets.set(periodKey(getDate(record).slice(0, 10), granularity), record);
    }
    return Array.from(buckets.values());
}

/** Keep the most recent `limit` records; reports whether anything was dropped. */
export function takeMostRecent<T>(records: T[], limit?: number): { records: T[]; truncated: boolean } {
    if (!limit || records.length <= limit) return { records, truncated: false };
    return { records: records.slice(-limit), truncated: true };
}

/** Compact account descriptor included in every account-scoped payload. */
export function accountRef(account: SavingsAccount) {
    return {
        id: account.id,
        name: account.name,
        type: account.type,
        typeLabel: ACCOUNT_TYPE_LABELS[account.type],
        currency: account.currency,
    };
}
