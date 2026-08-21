import type { Ausleihe, Handwerker, Werkzeuge } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface AusleiheDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Ausleihe;
  /** N:1-Ziel „Handwerker": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  handwerkerList: Handwerker[];
  /** Klick auf die Handwerker-Relation → overlay.push auf dessen Detail. */
  onOpenHandwerker?: (record: Handwerker) => void;
  /** N:1-Ziel „Werkzeuge": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  werkzeugeList: Werkzeuge[];
  /** Klick auf die Werkzeuge-Relation → overlay.push auf dessen Detail. */
  onOpenWerkzeuge?: (record: Werkzeuge) => void;
}

export function AusleiheDetails({
  record,
  handwerkerList,
  onOpenHandwerker,
  werkzeugeList,
  onOpenWerkzeuge,
}: AusleiheDetailsProps) {
  const handwerkerTarget = handwerkerList.find(r => r.record_id === extractRecordId(record.fields.handwerker));
  const werkzeugTarget = werkzeugeList.find(r => r.record_id === extractRecordId(record.fields.werkzeug));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('ausleihe', 'ausleihdatum')} value={record.fields.ausleihdatum} format="datetime" />
        <RecordField label={fieldLabel('ausleihe', 'geplantes_rueckgabedatum')} value={record.fields.geplantes_rueckgabedatum} format="date" />
        <RecordField label={fieldLabel('ausleihe', 'tatsaechliches_rueckgabedatum')} value={record.fields.tatsaechliches_rueckgabedatum} format="date" />
        <RecordField label={fieldLabel('ausleihe', 'zustand_ausleihe')} value={record.fields.zustand_ausleihe} format="pill" />
        <RecordField label={fieldLabel('ausleihe', 'zustand_rueckgabe')} value={record.fields.zustand_rueckgabe} format="pill" />
        <RecordField label={fieldLabel('ausleihe', 'bemerkungen_ausleihe')} value={record.fields.bemerkungen_ausleihe} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('ausleihe', 'handwerker')}
          name={handwerkerTarget?.fields.vorname ?? '—'}
          meta={[handwerkerTarget?.fields.telefon, handwerkerTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={handwerkerTarget && onOpenHandwerker ? () => onOpenHandwerker!(handwerkerTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('ausleihe', 'werkzeug')}
          name={werkzeugTarget?.fields.werkzeugname ?? '—'}
          meta={[werkzeugTarget?.fields.inventarnummer, werkzeugTarget?.fields.hersteller].filter(Boolean).join(' · ') || undefined}
          onClick={werkzeugTarget && onOpenWerkzeuge ? () => onOpenWerkzeuge!(werkzeugTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.AUSLEIHE} recordId={record.record_id} />
    </>
  );
}
