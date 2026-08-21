import type { WartungReparatur, Werkzeuge } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface WartungReparaturDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: WartungReparatur;
  /** N:1-Ziel „Werkzeuge": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  werkzeugeList: Werkzeuge[];
  /** Klick auf die Werkzeuge-Relation → overlay.push auf dessen Detail. */
  onOpenWerkzeuge?: (record: Werkzeuge) => void;
}

export function WartungReparaturDetails({
  record,
  werkzeugeList,
  onOpenWerkzeuge,
}: WartungReparaturDetailsProps) {
  const werkzeug_wrTarget = werkzeugeList.find(r => r.record_id === extractRecordId(record.fields.werkzeug_wr));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
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

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('wartung_reparatur', 'werkzeug_wr')}
          name={werkzeug_wrTarget?.fields.werkzeugname ?? '—'}
          meta={[werkzeug_wrTarget?.fields.inventarnummer, werkzeug_wrTarget?.fields.hersteller].filter(Boolean).join(' · ') || undefined}
          onClick={werkzeug_wrTarget && onOpenWerkzeuge ? () => onOpenWerkzeuge!(werkzeug_wrTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.WARTUNG_REPARATUR} recordId={record.record_id} />
    </>
  );
}
