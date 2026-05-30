import React, { useMemo, useState } from 'react';
import sharedStyles from '@/components/savings/SavingsShared.module.css';
import { PEAAllocationGroup, PEAConfig, SavingsAccount } from '@/models/savings';
import TransactionForm from './account-details/TransactionForm';
import AccountHeaderActions from './account-details/AccountHeaderActions';
import PerformanceCard from './account-details/PerformanceCard';
import PortfolioValueCard from './account-details/PortfolioValueCard';
import GainLossCard from './account-details/GainLossCard';
import ProjectedGainLossCard from './account-details/ProjectedGainLossCard';
import AnnualOverviewCard from './account-details/AnnualOverviewCard';
import GroupedAllocationCard from './account-details/GroupedAllocationCard';
import PositionsTable from './account-details/PositionsTable';
import TransactionsTable from './account-details/TransactionsTable';
import AllChartsModal from './account-details/AllChartsModal';
import AssetChartsModal from './account-details/AssetChartsModal';
import AnnualEditorModal from './account-details/AnnualEditorModal';
import { buildClipboardText } from './account-details/helpers/clipboard';
import { buildAnnualXirr } from './account-details/helpers/xirr';
import { buildAnnualOverviewRows } from './account-details/helpers/annualOverview';
import { sortPositions, sortTransactions } from './account-details/helpers/sorting';
import {
  AnnualOverviewRow,
  AssetChartPoint,
  AssetMetaInfo,
  AssetSparklinePoint,
  HistoryChartPoint,
  HistoryMetricPoint,
  PositionSortKey,
  SortDirection,
  TransactionSortKey
} from './account-details/types';
import { useSavingsAccountData } from '@/hooks/savings/useSavingsAccountData';
import { useAccountHistory } from '@/hooks/savings/useAccountHistory';
import { useAssetHistory } from '@/hooks/savings/useAssetHistory';
import { useAnnualValueEditor } from '@/hooks/savings/useAnnualValueEditor';
import { useTransactionEditor } from '@/hooks/savings/useTransactionEditor';
import { Button, Modal, Tabs } from '@/components/shared';
import {
  getActiveAssetInfo,
  mapGroupedAllocationData,
  mapAssetChartData,
  mapAssetSparklineData,
  mapHistoryChartData,
  mapHistoryMetrics
} from './account-details/helpers/mappers';

interface SavingsAccountDetailsProps {
  account: SavingsAccount;
  onBack: () => void;
}

interface GroupingConfigurationGroupDraft {
  name: string;
  stocks?: string[];
  tickers?: string[];
  isins?: string[];
}

interface GroupingConfigurationDraft {
  groups: GroupingConfigurationGroupDraft[];
  ungroupedLabel?: string;
}

function toGroupingDraft(config?: PEAConfig): GroupingConfigurationDraft {
  const groups = (config?.allocationGroups ?? []).map(group => ({
    name: group.name,
    stocks: group.tickers,
    isins: group.isins
  }));

  return {
    groups,
    ungroupedLabel: config?.allocationUngroupedLabel || 'Other assets'
  };
}

function parseGroupingDraft(rawText: string): GroupingConfigurationDraft {
  if (!rawText.trim()) {
    return { groups: [], ungroupedLabel: 'Other assets' };
  }

  const parsed = JSON.parse(rawText) as Partial<GroupingConfigurationDraft> | GroupingConfigurationGroupDraft[];
  const groups = Array.isArray(parsed)
    ? parsed
    : parsed.groups;

  if (!Array.isArray(groups)) {
    throw new Error('Expected a JSON object with a "groups" array.');
  }

  const normalizedGroups = groups.map((group, index) => {
    const stocks = Array.isArray(group.stocks)
      ? group.stocks
      : Array.isArray(group.tickers)
      ? group.tickers
      : [];
    if (!group.name || !stocks.length) {
      throw new Error(`Group #${index + 1} must contain a name and at least one stock.`);
    }

    return {
      name: group.name,
      stocks,
      isins: Array.isArray(group.isins) ? group.isins : undefined
    };
  });

  return {
    groups: normalizedGroups,
    ungroupedLabel: Array.isArray(parsed) ? 'Other assets' : (parsed.ungroupedLabel || 'Other assets')
  };
}

function toPeaAllocationGroups(draft: GroupingConfigurationDraft): PEAAllocationGroup[] {
  return draft.groups.map(group => {
    const stocks = group.stocks ?? group.tickers ?? [];
    return {
      name: group.name.trim(),
      tickers: stocks.map(stock => stock.trim()).filter(Boolean),
      isins: (group.isins ?? []).map(isin => isin.trim()).filter(Boolean)
    };
  });
}

export default function SavingsAccountDetails({ account, onBack }: SavingsAccountDetailsProps) {
  const initialPeaConfig = useMemo<PEAConfig | undefined>(() => {
    if (account.type !== 'PEA') return undefined;
    return account.config?.type === 'PEA' ? account.config : { type: 'PEA' };
  }, [account]);

  const [peaConfig, setPeaConfig] = useState<PEAConfig | undefined>(initialPeaConfig);
  const [showGroupingConfigModal, setShowGroupingConfigModal] = useState(false);
  const [groupingConfigText, setGroupingConfigText] = useState(() => {
    return JSON.stringify(toGroupingDraft(initialPeaConfig), null, 2);
  });
  const [groupingConfigError, setGroupingConfigError] = useState<string | null>(null);
  const [savingGroupingConfig, setSavingGroupingConfig] = useState(false);

  const {
    data,
    transactions,
    annualValues,
    setAnnualValues,
    loading,
    refreshData
  } = useSavingsAccountData(account.id);
  const { history, loading: historyLoading } = useAccountHistory(account.id);
  const isins = useMemo(() => data?.positions?.map(pos => pos.isin).filter(Boolean) || [], [data?.positions]);
  const { assetHistory } = useAssetHistory(isins);

  const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
  const [showCharts, setShowCharts] = useState(false);
  const [showAssetCharts, setShowAssetCharts] = useState(false);
  const [activeAssetIsin, setActiveAssetIsin] = useState<string | null>(null);
  const [positionsSort, setPositionsSort] = useState<{ key: PositionSortKey; direction: SortDirection }>(
    { key: 'asset', direction: 'asc' }
  );
  const [transactionsSort, setTransactionsSort] = useState<{ key: TransactionSortKey; direction: SortDirection }>(
    { key: 'date', direction: 'desc' }
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: account.currency }).format(val);
  };

  const formatPercent = (val: number) => {
    return (val * 1).toFixed(2) + '%';
  };

  const {
    isOpen: isTransactionEditorOpen,
    mode: transactionEditorMode,
    editingTransaction,
    openAddTransaction,
    openEditTransaction,
    closeTransactionEditor,
    saveTransaction
  } = useTransactionEditor({ accountId: account.id, onRefresh: refreshData });

  const copyTextToClipboard = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (typeof document === 'undefined') {
      throw new Error('Clipboard API and document fallback are unavailable.');
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error('Fallback clipboard copy failed.');
    }
  };

  const handleCopyContext = async () => {
    if (!data) return;
    const text = buildClipboardText({
      account,
      data,
      annualOverviewRows,
      transactions,
      formatCurrency,
      formatPercent
    });
    if (!text) return;

    try {
      await copyTextToClipboard(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const annualXirr = useMemo(() => {
    return buildAnnualXirr({
      transactions,
      annualValues,
      currentValue: data?.summary.currentValue
    });
  }, [transactions, annualValues, data?.summary.currentValue]);

  const annualOverviewRows: AnnualOverviewRow[] = useMemo(() => {
    return buildAnnualOverviewRows({
      transactions,
      annualValues,
      annualXirr,
      currentValue: data?.summary.currentValue
    });
  }, [transactions, annualValues, annualXirr, data?.summary.currentValue]);

  const historyChartData: HistoryChartPoint[] = useMemo(() => {
    return mapHistoryChartData(history);
  }, [history]);

  const historyMetrics: HistoryMetricPoint[] = useMemo(() => {
    return mapHistoryMetrics(history);
  }, [history]);

  const assetSparklineData: Record<string, AssetSparklinePoint[]> = useMemo(() => {
    return mapAssetSparklineData(assetHistory);
  }, [assetHistory]);

  const assetChartData: Record<string, AssetChartPoint[]> = useMemo(() => {
    return mapAssetChartData(assetHistory);
  }, [assetHistory]);

  const groupedAllocationData = useMemo(() => {
    if (!data?.positions || account.type !== 'PEA') return [];
    return mapGroupedAllocationData(data.positions, peaConfig);
  }, [data?.positions, account.type, peaConfig]);

  const hasConfiguredGroups = (peaConfig?.allocationGroups?.length ?? 0) > 0;

  const activeAssetInfo: AssetMetaInfo | null = useMemo(() => {
    return getActiveAssetInfo(activeAssetIsin, data?.positions);
  }, [activeAssetIsin, data?.positions]);

  const {
    editingYear,
    editingEndValue,
    setEditingEndValue,
    openAnnualEditor,
    closeAnnualEditor,
    saveAnnualValue
  } = useAnnualValueEditor({
    accountId: account.id,
    setAnnualValues
  });

  const toggleSort = <TKey extends string>(
    current: { key: TKey; direction: SortDirection },
    key: TKey
  ): { key: TKey; direction: SortDirection } => {
    if (current.key === key) {
      return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
    }
    return { key, direction: 'asc' };
  };

  const positionsSorted = useMemo(() => {
    if (!data) return [];
    return sortPositions(data.positions, positionsSort);
  }, [data, positionsSort]);

  const transactionsSorted = useMemo(() => {
    return sortTransactions(transactions, transactionsSort);
  }, [transactions, transactionsSort]);

  if (loading) return <div className={sharedStyles.emptyState}>Loading account details...</div>;
  if (!data) return <div className={sharedStyles.emptyState}>Error loading data</div>;

  const { summary } = data;

  const saveGroupingConfiguration = async () => {
    if (account.type !== 'PEA') return;

    setGroupingConfigError(null);
    let parsedDraft: GroupingConfigurationDraft;

    try {
      parsedDraft = parseGroupingDraft(groupingConfigText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON configuration.';
      setGroupingConfigError(message);
      return;
    }

    const nextConfig: PEAConfig = {
      type: 'PEA',
      allocationGroups: toPeaAllocationGroups(parsedDraft),
      allocationUngroupedLabel: parsedDraft.ungroupedLabel?.trim() || 'Other assets'
    };

    setSavingGroupingConfig(true);
    try {
      const response = await fetch('/api/savings/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...account,
          config: nextConfig
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to save grouping configuration.');
      }

      setPeaConfig(nextConfig);
      setShowGroupingConfigModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save grouping configuration.';
      setGroupingConfigError(message);
    } finally {
      setSavingGroupingConfig(false);
    }
  };

  return (
    <div>
      <Modal open={showGroupingConfigModal} onClose={() => setShowGroupingConfigModal(false)} title="Configure Allocation Groups" size="lg">
        <p style={{ color: '#9ca3af', marginTop: 0 }}>
          Use JSON to map positions to groups. Any asset that does not match a group is included in the ungrouped bucket.
        </p>
        <textarea
          className={sharedStyles.input}
          style={{ width: '100%', minHeight: '280px', resize: 'vertical', fontFamily: 'monospace' }}
          value={groupingConfigText}
          onChange={(event) => setGroupingConfigText(event.target.value)}
          spellCheck={false}
        />
        {groupingConfigError && (
          <div style={{ color: '#ef4444', marginTop: '0.75rem', fontSize: '0.875rem' }}>{groupingConfigError}</div>
        )}
        <div className={sharedStyles.formActions} style={{ marginTop: '1rem' }}>
          <Button variant="secondary" onClick={() => setShowGroupingConfigModal(false)}>Cancel</Button>
          <Button onClick={saveGroupingConfiguration} disabled={savingGroupingConfig}>
            {savingGroupingConfig ? 'Saving...' : 'Save Groups'}
          </Button>
        </div>
      </Modal>

      <TransactionForm
        open={isTransactionEditorOpen}
        mode={transactionEditorMode}
        initialTransaction={editingTransaction}
        positions={data?.positions}
        onSave={saveTransaction}
        onClose={closeTransactionEditor}
      />

      <AnnualEditorModal
        open={editingYear !== null}
        year={editingYear}
        endValue={editingEndValue}
        currency={account.currency}
        onChangeEndValue={setEditingEndValue}
        onClose={closeAnnualEditor}
        onSave={saveAnnualValue}
      />

      <AllChartsModal
        open={showCharts}
        loading={historyLoading}
        metrics={historyMetrics}
        onClose={() => setShowCharts(false)}
        formatCurrency={formatCurrency}
      />

      <AssetChartsModal
        open={showAssetCharts}
        activeIsin={activeAssetIsin}
        activeAssetInfo={activeAssetInfo}
        assetChartData={assetChartData}
        onClose={() => setShowAssetCharts(false)}
        formatCurrency={formatCurrency}
      />

      <AccountHeaderActions
        title={account.name}
        onBack={onBack}
        onAddTransaction={openAddTransaction}
        onRefreshPrices={refreshData}
        onCopyContext={handleCopyContext}
        onShowCharts={() => setShowCharts(true)}
      />

      <div className={sharedStyles.accountGrid}>
        <PerformanceCard
          summary={summary}
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
        />
        <PortfolioValueCard
          loading={historyLoading}
          data={historyChartData}
          formatCurrency={formatCurrency}
        />
        {account.type === 'PEA' && (
          <GroupedAllocationCard
            data={groupedAllocationData}
            hasConfiguredGroups={hasConfiguredGroups}
            formatCurrency={formatCurrency}
            onConfigureGroups={() => {
              setGroupingConfigText(JSON.stringify(toGroupingDraft(peaConfig), null, 2));
              setGroupingConfigError(null);
              setShowGroupingConfigModal(true);
            }}
          />
        )}
        <GainLossCard
          loading={historyLoading}
          data={historyChartData}
        />
        <ProjectedGainLossCard
          loading={historyLoading}
          metrics={historyMetrics}
          formatCurrency={formatCurrency}
        />
        <AnnualOverviewCard
          rows={annualOverviewRows}
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
          onEdit={openAnnualEditor}
        />
      </div>

      <Tabs
        items={[
          { id: 'positions', label: 'Positions' },
          { id: 'transactions', label: 'Transactions' }
        ]}
        active={activeTab}
        onChange={setActiveTab}
        ariaLabel="Account details tabs"
      />

      {activeTab === 'positions' ? (
        <PositionsTable
          positions={positionsSorted}
          positionsSort={positionsSort}
          onToggleSort={(key) => setPositionsSort(toggleSort(positionsSort, key))}
          sparklineData={assetSparklineData}
          formatCurrency={formatCurrency}
          formatPercent={formatPercent}
          onOpenAssetCharts={(isin) => {
            setActiveAssetIsin(isin);
            setShowAssetCharts(true);
          }}
        />
      ) : (
        <TransactionsTable
          transactions={transactionsSorted}
          transactionsSort={transactionsSort}
          onToggleSort={(key) => setTransactionsSort(toggleSort(transactionsSort, key))}
          formatCurrency={formatCurrency}
          onEditTransaction={openEditTransaction}
        />
      )}
    </div>
  );
}
