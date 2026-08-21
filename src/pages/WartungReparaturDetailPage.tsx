import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { WartungReparatur, Werkzeuge } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { WartungReparaturDialog } from '@/components/dialogs/WartungReparaturDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/WartungReparatur';
import { evalComputed } from '@/config/form-enhancements/types';
import { t, appLabel, fieldLabel, localeTag, CURRENCY } from '@/i18n';

export default function WartungReparaturDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<WartungReparatur | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [werkzeugeList, setWerkzeugeList] = useState<Werkzeuge[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, werkzeugeData] = await Promise.all([
        LivingAppsService.getWartungReparatur(),
        LivingAppsService.getWerkzeuge(),
      ]);
      setWerkzeugeList(werkzeugeData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: WartungReparatur['fields']) {
    if (!record) return;
    await LivingAppsService.updateWartungReparaturEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteWartungReparaturEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/wartung-reparatur');
  }

  function getWerkzeugeDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return werkzeugeList.find(r => r.record_id === refId)?.fields.werkzeugname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title={t('not_found')}
        action={
          <Button variant="ghost" onClick={() => navigate('/wartung-reparatur')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            {t('back')}
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/wartung-reparatur')}
      onEdit={() => setEditing(true)}
      backLabel={t('back')}
      editLabel={t('edit_button')}
    >
      <RecordHeader title={appLabel('wartung_reparatur')} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          werkzeug_wr: werkzeugeList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString(localeTag(), { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString(localeTag(), { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('wartung_reparatur', 'werkzeug_wr')} value={getWerkzeugeDisplayName(record.fields.werkzeug_wr)} format="text" />
        <RecordField label={fieldLabel('wartung_reparatur', 'vorgangstyp')} value={record.fields.vorgangstyp} format="pill" />
        <RecordField label={fieldLabel('wartung_reparatur', 'meldedatum')} value={record.fields.meldedatum} format="date" />
        <RecordField label={fieldLabel('wartung_reparatur', 'geplantes_datum')} value={record.fields.geplantes_datum} format="date" />
        <RecordField label={fieldLabel('wartung_reparatur', 'abschlussdatum')} value={record.fields.abschlussdatum} format="date" />
        <RecordField label={fieldLabel('wartung_reparatur', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('wartung_reparatur', 'durchfuehrende_stelle')} value={record.fields.durchfuehrende_stelle} format="pill" />
        <RecordField label={fieldLabel('wartung_reparatur', 'kosten')} value={record.fields.kosten} format="text" />
        <RecordField label={fieldLabel('wartung_reparatur', 'vorgang_status')} value={record.fields.vorgang_status} format="pill" />
        <RecordField label={fieldLabel('wartung_reparatur', 'bemerkungen_wartung')} value={record.fields.bemerkungen_wartung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.WARTUNG_REPARATUR} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          {t('delete')}
        </Button>
      </div>

      <WartungReparaturDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        werkzeugeList={werkzeugeList}
        enablePhotoScan={AI_PHOTO_SCAN['WartungReparatur']}
        enablePhotoLocation={AI_PHOTO_LOCATION['WartungReparatur']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete_entity', { entity: appLabel('wartung_reparatur') })}
        description={t('confirm_delete_desc')}
      />
    </RecordView>
  );
}
