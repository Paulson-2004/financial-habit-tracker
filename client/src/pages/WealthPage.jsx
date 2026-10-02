import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import BreakdownDonutChart from '../components/charts/BreakdownDonutChart.jsx';
import NetWorthChart from '../components/charts/NetWorthChart.jsx';
import AssetForm from '../components/wealth/AssetForm.jsx';
import LiabilityForm from '../components/wealth/LiabilityForm.jsx';
import { useCurrency } from '../hooks/useProfile.js';
import {
  useAssets,
  useCreateAsset,
  useCreateLiability,
  useDeleteAsset,
  useDeleteLiability,
  useLiabilities,
  useRecordSnapshot,
  useUpdateAsset,
  useUpdateLiability,
  useWealthSummary,
} from '../hooks/useWealth.js';
import {
  ASSET_CATEGORY_LABELS,
  defaultAssetFormValues,
  defaultLiabilityFormValues,
  LIABILITY_CATEGORY_LABELS,
} from '../schemas/wealthSchemas.js';
import { amountTone, describeNetWorthChange, toBreakdownSlices } from '../utils/wealth.js';
import { formatMoney } from '../utils/format.js';

function RecordList({ items, categoryLabels, amountKey, currency, onEdit, onDelete, emptyTitle, emptyDescription }) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
          <div>
            <p className="font-medium text-slate-900">{item.name}</p>
            <p className="text-xs text-slate-500">{categoryLabels[item.category]}</p>
            {item.description && <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="tabular-nums font-medium text-slate-900">{formatMoney(item[amountKey], currency)}</span>
            <button className="text-sm font-medium text-brand-600 hover:underline" onClick={() => onEdit(item)}>
              Edit
            </button>
            <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => onDelete(item)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function WealthPage() {
  const [assetModalState, setAssetModalState] = useState(null); // null | 'create' | asset object
  const [liabilityModalState, setLiabilityModalState] = useState(null);

  const currency = useCurrency();
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useWealthSummary();
  const { data: assets, isLoading: assetsLoading, isError: assetsError } = useAssets();
  const { data: liabilities, isLoading: liabilitiesLoading, isError: liabilitiesError } = useLiabilities();

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const createLiability = useCreateLiability();
  const updateLiability = useUpdateLiability();
  const deleteLiability = useDeleteLiability();
  const recordSnapshot = useRecordSnapshot();

  async function handleCreateAsset(values) {
    try {
      await createAsset.mutateAsync({ name: values.name, category: values.category, value: Number(values.value), description: values.description.trim() || undefined });
      toast.success('Asset added');
      setAssetModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not add asset');
    }
  }

  async function handleUpdateAsset(values) {
    try {
      await updateAsset.mutateAsync({
        id: assetModalState.id,
        payload: { name: values.name, category: values.category, value: Number(values.value), description: values.description.trim() || null },
      });
      toast.success('Asset updated');
      setAssetModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not update asset');
    }
  }

  async function handleDeleteAsset(asset) {
    if (!window.confirm(`Delete "${asset.name}"?`)) return;
    try {
      await deleteAsset.mutateAsync(asset.id);
      toast.success('Asset deleted');
    } catch (error) {
      toast.error(error.message ?? 'Could not delete asset');
    }
  }

  async function handleCreateLiability(values) {
    try {
      await createLiability.mutateAsync({ name: values.name, category: values.category, amount: Number(values.amount), description: values.description.trim() || undefined });
      toast.success('Liability added');
      setLiabilityModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not add liability');
    }
  }

  async function handleUpdateLiability(values) {
    try {
      await updateLiability.mutateAsync({
        id: liabilityModalState.id,
        payload: { name: values.name, category: values.category, amount: Number(values.amount), description: values.description.trim() || null },
      });
      toast.success('Liability updated');
      setLiabilityModalState(null);
    } catch (error) {
      toast.error(error.message ?? 'Could not update liability');
    }
  }

  async function handleDeleteLiability(liability) {
    if (!window.confirm(`Delete "${liability.name}"?`)) return;
    try {
      await deleteLiability.mutateAsync(liability.id);
      toast.success('Liability deleted');
    } catch (error) {
      toast.error(error.message ?? 'Could not delete liability');
    }
  }

  async function handleRecordSnapshot() {
    try {
      await recordSnapshot.mutateAsync();
      toast.success('Snapshot recorded');
    } catch (error) {
      toast.error(error.message ?? 'Could not record snapshot');
    }
  }

  const isEditingAsset = assetModalState && assetModalState !== 'create';
  const assetFormDefaultValues = isEditingAsset
    ? { name: assetModalState.name, category: assetModalState.category, value: String(assetModalState.value), description: assetModalState.description ?? '' }
    : defaultAssetFormValues;

  const isEditingLiability = liabilityModalState && liabilityModalState !== 'create';
  const liabilityFormDefaultValues = isEditingLiability
    ? { name: liabilityModalState.name, category: liabilityModalState.category, amount: String(liabilityModalState.amount), description: liabilityModalState.description ?? '' }
    : defaultLiabilityFormValues;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Wealth</h1>
        <Button variant="secondary" onClick={handleRecordSnapshot} isLoading={recordSnapshot.isPending}>
          Record snapshot
        </Button>
      </div>

      {summaryError && (
        <Card>
          <p className="text-sm text-red-600">Could not load your wealth summary. Please try again.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total assets" value={summaryLoading || summaryError ? '—' : formatMoney(summary.totalAssets, currency)} />
        <StatCard label="Total liabilities" value={summaryLoading || summaryError ? '—' : formatMoney(summary.totalLiabilities, currency)} />
        <StatCard
          label="Net worth"
          value={summaryLoading || summaryError ? '—' : formatMoney(summary.netWorth, currency)}
          tone={summaryLoading || summaryError ? 'neutral' : amountTone(summary.netWorth)}
          sublabel={summaryLoading || summaryError ? undefined : describeNetWorthChange(summary.netWorthChange, currency)}
        />
      </div>

      <Card title="Net worth growth">
        {summaryLoading ? <Spinner label="Loading..." /> : <NetWorthChart history={summary?.netWorthHistory} currency={currency} />}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Asset allocation">
          {summaryLoading ? (
            <Spinner label="Loading..." />
          ) : (
            <BreakdownDonutChart
              slices={toBreakdownSlices(summary?.assetAllocation ?? [], ASSET_CATEGORY_LABELS)}
              currency={currency}
              ariaLabel="Donut chart of your asset allocation by category"
              emptyTitle="No assets yet"
              emptyDescription="Add an asset below to see your allocation."
            />
          )}
        </Card>
        <Card title="Liability breakdown">
          {summaryLoading ? (
            <Spinner label="Loading..." />
          ) : (
            <BreakdownDonutChart
              slices={toBreakdownSlices(summary?.liabilityBreakdown ?? [], LIABILITY_CATEGORY_LABELS)}
              currency={currency}
              ariaLabel="Donut chart of your liability breakdown by category"
              emptyTitle="No liabilities yet"
              emptyDescription="Add a liability below to see your breakdown."
            />
          )}
        </Card>
      </div>

      <Card title="Assets" action={<Button onClick={() => setAssetModalState('create')}>Add asset</Button>}>
        {assetsLoading && <Spinner label="Loading assets..." />}
        {assetsError && <p className="text-sm text-red-600">Could not load your assets.</p>}
        {!assetsLoading && !assetsError && (
          <RecordList
            items={assets}
            categoryLabels={ASSET_CATEGORY_LABELS}
            amountKey="value"
            currency={currency}
            onEdit={setAssetModalState}
            onDelete={handleDeleteAsset}
            emptyTitle="No assets yet"
            emptyDescription="Add your first asset - cash, a bank account, investments, property, and more."
          />
        )}
      </Card>

      <Card title="Liabilities" action={<Button onClick={() => setLiabilityModalState('create')}>Add liability</Button>}>
        {liabilitiesLoading && <Spinner label="Loading liabilities..." />}
        {liabilitiesError && <p className="text-sm text-red-600">Could not load your liabilities.</p>}
        {!liabilitiesLoading && !liabilitiesError && (
          <RecordList
            items={liabilities}
            categoryLabels={LIABILITY_CATEGORY_LABELS}
            amountKey="amount"
            currency={currency}
            onEdit={setLiabilityModalState}
            onDelete={handleDeleteLiability}
            emptyTitle="No liabilities yet"
            emptyDescription="Add a loan, credit card balance, or other debt to track here."
          />
        )}
      </Card>

      <Modal title={isEditingAsset ? 'Edit asset' : 'Add asset'} isOpen={Boolean(assetModalState)} onClose={() => setAssetModalState(null)}>
        <AssetForm
          key={isEditingAsset ? assetModalState.id : 'create'}
          defaultValues={assetFormDefaultValues}
          onSubmit={isEditingAsset ? handleUpdateAsset : handleCreateAsset}
          onCancel={() => setAssetModalState(null)}
          isSubmitting={createAsset.isPending || updateAsset.isPending}
        />
      </Modal>

      <Modal title={isEditingLiability ? 'Edit liability' : 'Add liability'} isOpen={Boolean(liabilityModalState)} onClose={() => setLiabilityModalState(null)}>
        <LiabilityForm
          key={isEditingLiability ? liabilityModalState.id : 'create'}
          defaultValues={liabilityFormDefaultValues}
          onSubmit={isEditingLiability ? handleUpdateLiability : handleCreateLiability}
          onCancel={() => setLiabilityModalState(null)}
          isSubmitting={createLiability.isPending || updateLiability.isPending}
        />
      </Modal>
    </div>
  );
}
