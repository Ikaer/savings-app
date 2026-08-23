import { AssetPriceInfo, PriceHistory } from '@/models/savings';
import yahooFinance from 'yahoo-finance2';

/**
 * Interface for price providers to ensure agnosticism
 */
export interface PriceProvider {
    getCurrentPrice(ticker: string): Promise<number>;
    getHistory(ticker: string, from: Date, to: Date): Promise<PriceHistory[]>;
    getQuote(ticker: string): Promise<AssetPriceInfo>;
}

/**
 * Yahoo Finance implementation of PriceProvider
 * Handle class instantiation required by v3.x
 */
const yf = new (yahooFinance as any)({ suppressNotices: ['yahooSurvey'] });

/** A week back, so the window still contains a session over weekends and holidays. */
const CHART_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeTicker(ticker: string): string {
    const trimmed = ticker.trim();
    const euronextMatch = /^EPA[.:](.+)$/i.exec(trimmed);
    if (euronextMatch && euronextMatch[1]) {
        return `${euronextMatch[1]}.PA`;
    }
    return trimmed;
}

class YahooFinanceProvider implements PriceProvider {
    /**
     * Deliberately `chart` and not `quote`: `quote` requires a Yahoo crumb, and the
     * cookie handshake that obtains one dies behind Yahoo's EU consent gate
     * ("Unexpected redirect to .../quote/AAPL?guccounter=1" — observed in production
     * on 2026-08-23, affecting every ticker at once). The chart endpoint carries the
     * same `regularMarketPrice` and needs no crumb.
     */
    private async fetchLatestPrice(ticker: string): Promise<number> {
        const result = await yf.chart(normalizeTicker(ticker), {
            period1: new Date(Date.now() - CHART_LOOKBACK_MS),
            interval: '1d',
        });
        return result?.meta?.regularMarketPrice || 0;
    }

    async getCurrentPrice(ticker: string): Promise<number> {
        return this.fetchLatestPrice(ticker);
    }

    async getHistory(ticker: string, from: Date, to: Date): Promise<PriceHistory[]> {
        const result = await yf.historical(normalizeTicker(ticker), {
            period1: from,
            period2: to,
        }) as any[];

        return result.map((item: any) => ({
            date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : String(item.date),
            price: item.close
        }));
    }

    async getQuote(ticker: string): Promise<AssetPriceInfo> {
        return {
            ticker,
            currentPrice: await this.fetchLatestPrice(ticker),
            lastUpdated: new Date().toISOString()
        };
    }
}

/**
 * Singleton instance of the price provider
 */
export const priceProvider: PriceProvider = new YahooFinanceProvider();

/**
 * Utility to fetch multiple prices
 */
export async function fetchCurrentPrices(tickers: string[]): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    if (tickers.length === 0) return result;

    // Fetch in parallel
    await Promise.all(tickers.map(async (ticker) => {
        try {
            const price = await priceProvider.getCurrentPrice(ticker);
            if (Number.isFinite(price)) {
                result[ticker] = price;
            } else {
                console.warn(`Ignoring non-finite price for ${ticker}:`, price);
            }
        } catch (error) {
            console.error(`Failed to fetch price for ${ticker}:`, error);
        }
    }));

    return result;
}
