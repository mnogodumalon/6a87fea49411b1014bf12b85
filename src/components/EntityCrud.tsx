/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'handwerker'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.handwerker.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.handwerker.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.handwerker.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.handwerker              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   handwerker: vorname, nachname, personalnummer, telefon, email, abteilung, status  ·  ← ausleihe (list + contextual +)
 *   werkzeuge: werkzeugname, inventarnummer, kategorie, hersteller, modell, kaufdatum, standort, werkzeug_status, …  ·  ← ausleihe (list + contextual +) · ← wartung_reparatur (list + contextual +)
 *   ausleihe: handwerker, werkzeug, ausleihdatum, geplantes_rueckgabedatum, tatsaechliches_rueckgabedatum, zustand_ausleihe, zustand_rueckgabe, bemerkungen_ausleihe  ·  → handwerker · → werkzeuge
 *   wartung_reparatur: werkzeug_wr, vorgangstyp, meldedatum, geplantes_datum, abschlussdatum, beschreibung, durchfuehrende_stelle, kosten, …  ·  → werkzeuge
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Handwerker, Werkzeuge, Ausleihe, WartungReparatur } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichAusleihe, enrichWartungReparatur } from '@/lib/enrich';
import type { EnrichedAusleihe, EnrichedWartungReparatur } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { HandwerkerDialog, type HandwerkerDialogDefaults } from '@/components/dialogs/HandwerkerDialog';
import { HandwerkerDetails } from '@/components/details/HandwerkerDetails';
import { WerkzeugeDialog, type WerkzeugeDialogDefaults } from '@/components/dialogs/WerkzeugeDialog';
import { WerkzeugeDetails } from '@/components/details/WerkzeugeDetails';
import { AusleiheDialog, type AusleiheDialogDefaults } from '@/components/dialogs/AusleiheDialog';
import { AusleiheDetails } from '@/components/details/AusleiheDetails';
import { WartungReparaturDialog, type WartungReparaturDialogDefaults } from '@/components/dialogs/WartungReparaturDialog';
import { WartungReparaturDetails } from '@/components/details/WartungReparaturDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'handwerker'; record: Handwerker }
  | { type: 'werkzeuge'; record: Werkzeuge }
  | { type: 'ausleihe'; record: EnrichedAusleihe }
  | { type: 'wartungReparatur'; record: EnrichedWartungReparatur };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  handwerker: EntityCrudApi<Handwerker, HandwerkerDialogDefaults>;
  werkzeuge: EntityCrudApi<Werkzeuge, WerkzeugeDialogDefaults>;
  ausleihe: EntityCrudApi<Ausleihe, AusleiheDialogDefaults>;
  wartungReparatur: EntityCrudApi<WartungReparatur, WartungReparaturDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { handwerker: Handwerker[]; werkzeuge: Werkzeuge[]; ausleihe: EnrichedAusleihe[]; wartungReparatur: EnrichedWartungReparatur[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [handwerkerDialog, setHandwerkerDialog] = useState<{ defaults?: HandwerkerDialogDefaults; editing?: Handwerker } | null>(null);
  const [werkzeugeDialog, setWerkzeugeDialog] = useState<{ defaults?: WerkzeugeDialogDefaults; editing?: Werkzeuge } | null>(null);
  const [ausleiheDialog, setAusleiheDialog] = useState<{ defaults?: AusleiheDialogDefaults; editing?: Ausleihe } | null>(null);
  const [wartungReparaturDialog, setWartungReparaturDialog] = useState<{ defaults?: WartungReparaturDialogDefaults; editing?: WartungReparatur } | null>(null);
  const enrichedAusleihe = useMemo(() => enrichAusleihe(data.ausleihe, { handwerkerMap: data.handwerkerMap, werkzeugeMap: data.werkzeugeMap }), [data.ausleihe, data.handwerkerMap, data.werkzeugeMap]);
  const enrichedWartungReparatur = useMemo(() => enrichWartungReparatur(data.wartungReparatur, { werkzeugeMap: data.werkzeugeMap }), [data.wartungReparatur, data.werkzeugeMap]);

  function detailHandwerker(record: Handwerker, push = false) {
    const item: OverlayItem = { type: 'handwerker', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitHandwerker(fields: Handwerker['fields']) {
    const editing = handwerkerDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setHandwerker(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateHandwerkerEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('handwerker')} — ${t('crud_updated')}`, async () => {
        data.setHandwerker(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateHandwerkerEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createHandwerkerEntry(fields);
      undoToast(`${appLabel('handwerker')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailWerkzeuge(record: Werkzeuge, push = false) {
    const item: OverlayItem = { type: 'werkzeuge', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitWerkzeuge(fields: Werkzeuge['fields']) {
    const editing = werkzeugeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setWerkzeuge(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateWerkzeugeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('werkzeuge')} — ${t('crud_updated')}`, async () => {
        data.setWerkzeuge(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateWerkzeugeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createWerkzeugeEntry(fields);
      undoToast(`${appLabel('werkzeuge')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAusleihe(record: Ausleihe, push = false) {
    const rec = enrichedAusleihe.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'ausleihe', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAusleihe(fields: Ausleihe['fields']) {
    const editing = ausleiheDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAusleihe(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAusleiheEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('ausleihe')} — ${t('crud_updated')}`, async () => {
        data.setAusleihe(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAusleiheEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAusleiheEntry(fields);
      undoToast(`${appLabel('ausleihe')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailWartungReparatur(record: WartungReparatur, push = false) {
    const rec = enrichedWartungReparatur.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'wartungReparatur', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitWartungReparatur(fields: WartungReparatur['fields']) {
    const editing = wartungReparaturDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setWartungReparatur(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateWartungReparaturEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('wartung_reparatur')} — ${t('crud_updated')}`, async () => {
        data.setWartungReparatur(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateWartungReparaturEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createWartungReparaturEntry(fields);
      undoToast(`${appLabel('wartung_reparatur')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <HandwerkerDialog
        open={handwerkerDialog !== null}
        onClose={() => setHandwerkerDialog(null)}
        onSubmit={submitHandwerker}
        defaultValues={handwerkerDialog?.defaults}
        recordId={handwerkerDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Handwerker']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Handwerker']}
      />
      <WerkzeugeDialog
        open={werkzeugeDialog !== null}
        onClose={() => setWerkzeugeDialog(null)}
        onSubmit={submitWerkzeuge}
        defaultValues={werkzeugeDialog?.defaults}
        recordId={werkzeugeDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Werkzeuge']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Werkzeuge']}
      />
      <AusleiheDialog
        open={ausleiheDialog !== null}
        onClose={() => setAusleiheDialog(null)}
        onSubmit={submitAusleihe}
        defaultValues={ausleiheDialog?.defaults}
        recordId={ausleiheDialog?.editing?.record_id}
        handwerkerList={data.handwerker}
        werkzeugeList={data.werkzeuge}
        enablePhotoScan={AI_PHOTO_SCAN['Ausleihe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Ausleihe']}
      />
      <WartungReparaturDialog
        open={wartungReparaturDialog !== null}
        onClose={() => setWartungReparaturDialog(null)}
        onSubmit={submitWartungReparatur}
        defaultValues={wartungReparaturDialog?.defaults}
        recordId={wartungReparaturDialog?.editing?.record_id}
        werkzeugeList={data.werkzeuge}
        enablePhotoScan={AI_PHOTO_SCAN['WartungReparatur']}
        enablePhotoLocation={AI_PHOTO_LOCATION['WartungReparatur']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'handwerker') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('handwerker')} subtitle={undefined} />
                <HandwerkerDetails
                  record={top.record}
                  ausleiheList={data.ausleihe}
                  onOpenAusleihe={(r) => detailAusleihe(r, true)}
                  onAddAusleihe={() => setAusleiheDialog({ defaults: { handwerker: createRecordUrl(APP_IDS.HANDWERKER, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'werkzeuge') {
            return (
              <>
                <RecordHeader title={top.record.fields.werkzeugname ?? appLabel('werkzeuge')} subtitle={top.record.fields.kaufdatum ? formatDate(top.record.fields.kaufdatum) : undefined} />
                <WerkzeugeDetails
                  record={top.record}
                  ausleiheList={data.ausleihe}
                  onOpenAusleihe={(r) => detailAusleihe(r, true)}
                  onAddAusleihe={() => setAusleiheDialog({ defaults: { werkzeug: createRecordUrl(APP_IDS.WERKZEUGE, top.record.record_id) } })}
                  wartungReparaturList={data.wartungReparatur}
                  onOpenWartungReparatur={(r) => detailWartungReparatur(r, true)}
                  onAddWartungReparatur={() => setWartungReparaturDialog({ defaults: { werkzeug_wr: createRecordUrl(APP_IDS.WERKZEUGE, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'ausleihe') {
            return (
              <>
                <RecordHeader title={appLabel('ausleihe')} subtitle={top.record.fields.ausleihdatum ? formatDate(top.record.fields.ausleihdatum) : undefined} />
                <AusleiheDetails
                  record={top.record}
                  handwerkerList={data.handwerker}
                  onOpenHandwerker={(r) => detailHandwerker(r, true)}
                  werkzeugeList={data.werkzeuge}
                  onOpenWerkzeuge={(r) => detailWerkzeuge(r, true)}
                />
              </>
            );
          }
          if (top.type === 'wartungReparatur') {
            return (
              <>
                <RecordHeader title={appLabel('wartung_reparatur')} subtitle={top.record.fields.meldedatum ? formatDate(top.record.fields.meldedatum) : undefined} />
                <WartungReparaturDetails
                  record={top.record}
                  werkzeugeList={data.werkzeuge}
                  onOpenWerkzeuge={(r) => detailWerkzeuge(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'handwerker') setHandwerkerDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'werkzeuge') setWerkzeugeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'ausleihe') setAusleiheDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'wartungReparatur') setWartungReparaturDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    handwerker: {
      openCreate: (defaults?: HandwerkerDialogDefaults) => setHandwerkerDialog({ defaults }),
      openEdit: (record: Handwerker) => setHandwerkerDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Handwerker) => detailHandwerker(record, false),
    },
    werkzeuge: {
      openCreate: (defaults?: WerkzeugeDialogDefaults) => setWerkzeugeDialog({ defaults }),
      openEdit: (record: Werkzeuge) => setWerkzeugeDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Werkzeuge) => detailWerkzeuge(record, false),
    },
    ausleihe: {
      openCreate: (defaults?: AusleiheDialogDefaults) => setAusleiheDialog({ defaults }),
      openEdit: (record: Ausleihe) => setAusleiheDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Ausleihe) => detailAusleihe(record, false),
    },
    wartungReparatur: {
      openCreate: (defaults?: WartungReparaturDialogDefaults) => setWartungReparaturDialog({ defaults }),
      openEdit: (record: WartungReparatur) => setWartungReparaturDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: WartungReparatur) => detailWartungReparatur(record, false),
    },
    enriched: { handwerker: data.handwerker, werkzeuge: data.werkzeuge, ausleihe: enrichedAusleihe, wartungReparatur: enrichedWartungReparatur },
  };
}
