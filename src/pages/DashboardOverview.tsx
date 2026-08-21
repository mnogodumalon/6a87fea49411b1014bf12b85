import { useState, useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { KanbanWidget } from '@/components/widgets/KanbanWidget';
import type { KanbanCard, KanbanColumn } from '@/components/widgets/KanbanWidget';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';
import { lookupOption, LOOKUP_OPTIONS } from '@/types/app';
import { lookupKey } from '@/lib/formatters';
import { LivingAppsService } from '@/services/livingAppsService';
import { extractRecordId } from '@/services/livingAppsService';
import { format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import {
  IconAlertTriangle,
  IconTool,
  IconCircleCheck,
  IconArrowBack,
} from '@tabler/icons-react';

export default function DashboardOverview() {
  const data = useDashboardData();
  const {
    handwerker, werkzeuge, ausleihe, wartungReparatur,
    setWerkzeuge, setAusleihe, setWartungReparatur,
    handwerkerMap, werkzeugeMap,
    loading, error, fetchAll,
  } = data;

  const clock = useClock();
  const [filterKey, setFilterKey] = useState<string | null>(null);

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'wartungReparatur') {
        const r = top.record;
        const status = lookupKey(r.fields.vorgang_status);
        if (status === 'offen') {
          return {
            label: tx('In Bearbeitung setzen'),
            onClick: () => advanceWartung(r),
          };
        }
        if (status === 'in_bearbeitung') {
          return {
            label: tx('Abschließen'),
            onClick: () => closeWartung(r),
          };
        }
      }
      if (top.type === 'ausleihe') {
        const r = top.record;
        if (!r.fields.tatsaechliches_rueckgabedatum) {
          return {
            label: tx('Zurückgegeben'),
            onClick: () => returnWerkzeug(r),
          };
        }
      }
      return undefined;
    },
  });

  const enrichedAusleihe = crud.enriched.ausleihe;
  const enrichedWartungReparatur = crud.enriched.wartungReparatur;

  // ─── All hooks above early returns ───────────────────────────────────────

  const columns = useMemo((): KanbanColumn[] =>
    (LOOKUP_OPTIONS['werkzeuge']?.['werkzeug_status'] ?? []).map(o => ({
      key: o.key,
      label: o.label,
      tone:
        o.key === 'verfuegbar' ? 'success' :
        o.key === 'ausgeliehen' ? 'primary' :
        o.key === 'in_wartung' || o.key === 'in_reparatur' ? 'warning' :
        o.key === 'ausser_betrieb' ? 'destructive' :
        'default',
    }))
  , []);

  const filteredWerkzeuge = useMemo(() =>
    filterKey ? werkzeuge.filter(w => lookupKey(w.fields.werkzeug_status) === filterKey) : werkzeuge
  , [werkzeuge, filterKey]);

  const activeLoansAll = useMemo(
    () => enrichedAusleihe.filter(a => !a.fields.tatsaechliches_rueckgabedatum),
    [enrichedAusleihe]
  );

  const cards = useMemo((): KanbanCard[] =>
    filteredWerkzeuge.map(w => {
      const status = lookupKey(w.fields.werkzeug_status) ?? '';
      const loan = activeLoansAll.find(a => extractRecordId(a.fields.werkzeug) === w.record_id);
      const borrowerName = loan ? loan.handwerkerName : undefined;
      return {
        id: `werkzeug:${w.record_id}`,
        column: status,
        title: w.fields.werkzeugname ?? tx('Unbenannt'),
        subtitle: borrowerName
          ? tx`bei ${borrowerName}`
          : w.fields.standort ?? w.fields.kategorie?.label,
        tone:
          status === 'verfuegbar' ? 'default' :
          status === 'ausgeliehen' ? 'primary' :
          status === 'in_wartung' || status === 'in_reparatur' ? 'warning' :
          status === 'ausser_betrieb' ? 'destructive' :
          'default',
      };
    })
  , [filteredWerkzeuge, activeLoansAll]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  // ─── Plain derivations below ─────────────────────────────────────────────
  const today = startOfDay(clock);
  const todayStr = format(clock, 'yyyy-MM-dd');

  // Active loans (alias for JSX usage)
  const activeLoans = activeLoansAll;
  // Overdue = active + geplantes_rueckgabedatum < today
  const overdueLoans = activeLoans.filter(a => {
    if (!a.fields.geplantes_rueckgabedatum) return false;
    return isBefore(parseISO(a.fields.geplantes_rueckgabedatum), today);
  });

  // Open/in-progress maintenance
  const openWartung = enrichedWartungReparatur.filter(w => {
    const s = lookupKey(w.fields.vorgang_status);
    return s === 'offen' || s === 'in_bearbeitung';
  });

  // Werkzeug status counts
  const verfuegbar = werkzeuge.filter(w => lookupKey(w.fields.werkzeug_status) === 'verfuegbar').length;
  const ausgeliehen = werkzeuge.filter(w => lookupKey(w.fields.werkzeug_status) === 'ausgeliehen').length;
  const inService = werkzeuge.filter(w => {
    const s = lookupKey(w.fields.werkzeug_status);
    return s === 'in_wartung' || s === 'in_reparatur';
  }).length;

  // ─── Handlers ────────────────────────────────────────────────────────────

  async function returnWerkzeug(a: typeof enrichedAusleihe[number]) {
    const prevAusleihe = ausleihe.map(x => ({ ...x }));
    const prevWerkzeuge = werkzeuge.map(x => ({ ...x }));
    // Optimistic: set return date + werkzeug back to verfuegbar
    setAusleihe(prev =>
      prev.map(x =>
        x.record_id === a.record_id
          ? { ...x, fields: { ...x.fields, tatsaechliches_rueckgabedatum: todayStr } }
          : x
      )
    );
    const werkzeugId = extractRecordId(a.fields.werkzeug);
    if (werkzeugId) {
      setWerkzeuge(prev =>
        prev.map(x =>
          x.record_id === werkzeugId
            ? { ...x, fields: { ...x.fields, werkzeug_status: lookupOption('werkzeuge', 'werkzeug_status', 'verfuegbar') } }
            : x
        )
      );
    }
    const name = a.werkzeugName || a.handwerkerName;
    undoToast(tx`${name} — zurückgegeben`, async () => {
      setAusleihe(prevAusleihe);
      setWerkzeuge(prevWerkzeuge);
      await LivingAppsService.updateAusleiheEntry(a.record_id, { tatsaechliches_rueckgabedatum: undefined });
      if (werkzeugId) await LivingAppsService.updateWerkzeugeEntry(werkzeugId, { werkzeug_status: 'ausgeliehen' });
    });
    try {
      await LivingAppsService.updateAusleiheEntry(a.record_id, { tatsaechliches_rueckgabedatum: todayStr });
      if (werkzeugId) await LivingAppsService.updateWerkzeugeEntry(werkzeugId, { werkzeug_status: 'verfuegbar' });
    } catch {
      setAusleihe(prevAusleihe);
      setWerkzeuge(prevWerkzeuge);
      await fetchAll();
    }
  }

  async function advanceWartung(w: typeof enrichedWartungReparatur[number]) {
    const prev = wartungReparatur.map(x => ({ ...x }));
    setWartungReparatur(p =>
      p.map(x =>
        x.record_id === w.record_id
          ? { ...x, fields: { ...x.fields, vorgang_status: lookupOption('wartung_reparatur', 'vorgang_status', 'in_bearbeitung') } }
          : x
      )
    );
    const name = w.werkzeug_wrName || tx('Vorgang');
    undoToast(tx`${name} — in Bearbeitung`, async () => {
      setWartungReparatur(prev);
      await LivingAppsService.updateWartungReparaturEntry(w.record_id, { vorgang_status: 'offen' });
    });
    try {
      await LivingAppsService.updateWartungReparaturEntry(w.record_id, { vorgang_status: 'in_bearbeitung' });
    } catch {
      setWartungReparatur(prev);
      await fetchAll();
    }
  }

  async function closeWartung(w: typeof enrichedWartungReparatur[number]) {
    const prev = wartungReparatur.map(x => ({ ...x }));
    setWartungReparatur(p =>
      p.map(x =>
        x.record_id === w.record_id
          ? { ...x, fields: { ...x.fields, vorgang_status: lookupOption('wartung_reparatur', 'vorgang_status', 'abgeschlossen'), abschlussdatum: todayStr } }
          : x
      )
    );
    const name = w.werkzeug_wrName || tx('Vorgang');
    undoToast(tx`${name} — abgeschlossen`, async () => {
      setWartungReparatur(prev);
      await LivingAppsService.updateWartungReparaturEntry(w.record_id, { vorgang_status: 'in_bearbeitung', abschlussdatum: undefined });
    });
    try {
      await LivingAppsService.updateWartungReparaturEntry(w.record_id, {
        vorgang_status: 'abgeschlossen',
        abschlussdatum: todayStr,
      });
    } catch {
      setWartungReparatur(prev);
      await fetchAll();
    }
  }

  async function onCardMove(cardId: string, newColumn: string) {
    const id = cardId.split(':')[1];
    const w = werkzeuge.find(x => x.record_id === id);
    if (!w) return;
    const prev = werkzeuge.map(x => ({ ...x }));
    setWerkzeuge(p =>
      p.map(x =>
        x.record_id === id
          ? { ...x, fields: { ...x.fields, werkzeug_status: lookupOption('werkzeuge', 'werkzeug_status', newColumn) } }
          : x
      )
    );
    const colLabel = columns.find(c => c.key === newColumn)?.label ?? newColumn;
    undoToast(tx`${w.fields.werkzeugname ?? ''} — ${colLabel}`, async () => {
      setWerkzeuge(prev);
      const oldKey = lookupKey(w.fields.werkzeug_status) ?? 'verfuegbar';
      await LivingAppsService.updateWerkzeugeEntry(id, { werkzeug_status: oldKey });
    });
    try {
      await LivingAppsService.updateWerkzeugeEntry(id, { werkzeug_status: newColumn });
    } catch {
      setWerkzeuge(prev);
      await fetchAll();
    }
  }

  // ─── Context line ─────────────────────────────────────────────────────────
  const contextLine = (() => {
    if (overdueLoans.length > 0) {
      const names = namen(overdueLoans.map(a => a.handwerkerName));
      return tx`${names} — Werkzeug überfällig zurück.`;
    }
    if (activeLoans.length > 0) {
      const names = namen(activeLoans.map(a => a.handwerkerName));
      return tx`Zurzeit ausgeliehen: ${names}.`;
    }
    if (verfuegbar > 0) {
      return tx`Alle Werkzeuge verfügbar.`;
    }
    return tx`Werkzeugbestand im Überblick.`;
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{gruss(clock)}</h1>
        <p className="text-muted-foreground mt-1">{contextLine}</p>
      </div>

      <DashboardGrid
        variant="wide"
        hero={
          overdueLoans.length > 0 ? (
            <HeroBanner
              icon={<IconAlertTriangle size={18} />}
              action={{
                label: tx('Rückgabe erfassen'),
                onClick: () => crud.ausleihe.openDetail(overdueLoans[0]),
              }}
            >
              <b>{namen(overdueLoans.map(a => a.werkzeugName))}</b>{' '}
              {tx('überfällig')} — {tx('geplante Rückgabe')}: <b>{formatDate(overdueLoans[0].fields.geplantes_rueckgabedatum)}</b>
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Verfügbar')}
              value={verfuegbar}
              icon={<IconCircleCheck size={16} />}
              tone={verfuegbar > 0 ? 'success' : 'default'}
              onClick={() => setFilterKey(f => f === 'verfuegbar' ? null : 'verfuegbar')}
              active={filterKey === 'verfuegbar'}
            />
            <StatStripItem
              title={tx('Ausgeliehen')}
              value={ausgeliehen}
              icon={<IconArrowBack size={16} />}
              tone={ausgeliehen > 0 ? 'primary' : 'default'}
              onClick={() => setFilterKey(f => f === 'ausgeliehen' ? null : 'ausgeliehen')}
              active={filterKey === 'ausgeliehen'}
            />
            <StatStripItem
              title={tx('In Wartung/Reparatur')}
              value={inService}
              icon={<IconTool size={16} />}
              tone={inService > 0 ? 'warning' : 'default'}
              onClick={() => setFilterKey(f => (f === 'in_wartung' || f === 'in_reparatur') ? null : 'in_wartung')}
              active={filterKey === 'in_wartung' || filterKey === 'in_reparatur'}
            />
            <StatStripItem
              title={appLabel('handwerker')}
              value={handwerker.filter(h => lookupKey(h.fields.status) === 'aktiv').length}
              icon={<IconTool size={16} />}
              tone="default"
            />
          </StatStrip>
        }
        primary={
          <KanbanWidget
            columns={columns}
            cards={cards}
            defaultCollapsed={['ausser_betrieb']}
            onCardClick={card => {
              const id = card.id.split(':')[1];
              const w = werkzeuge.find(x => x.record_id === id);
              if (w) crud.werkzeuge.openDetail(w);
            }}
            onCardMove={onCardMove}
            onAddCard={colKey =>
              crud.werkzeuge.openCreate({ werkzeug_status: colKey })
            }
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Aktive Ausleihen')}
              items={activeLoans
                .sort((a, b) => {
                  // overdue first, then by geplantes_rueckgabedatum
                  const aDate = a.fields.geplantes_rueckgabedatum ?? '';
                  const bDate = b.fields.geplantes_rueckgabedatum ?? '';
                  return aDate.localeCompare(bDate);
                })
                .slice(0, 8)
                .map(a => {
                  const isOverdue = a.fields.geplantes_rueckgabedatum
                    ? isBefore(parseISO(a.fields.geplantes_rueckgabedatum), today)
                    : false;
                  return {
                    id: a.record_id,
                    title: `${a.werkzeugName}`,
                    secondLine: (
                      <>
                        <span className={isOverdue ? 'font-medium text-destructive' : 'text-muted-foreground'}>
                          {isOverdue ? tx('Überfällig') : tx('Ausgeliehen')}
                        </span>
                        {a.handwerkerName && (
                          <span className="text-muted-foreground"> · {a.handwerkerName}</span>
                        )}
                        {a.fields.geplantes_rueckgabedatum && (
                          <span className="text-muted-foreground"> · {formatDate(a.fields.geplantes_rueckgabedatum)}</span>
                        )}
                      </>
                    ),
                    action: {
                      label: tx('Zurück'),
                      onClick: () => returnWerkzeug(a),
                    },
                  };
                })}
              onItemClick={id => {
                const a = enrichedAusleihe.find(x => x.record_id === id);
                if (a) crud.ausleihe.openDetail(a);
              }}
              empty={{
                text: tx('Keine aktiven Ausleihen — alle Werkzeuge verfügbar'),
                action: {
                  label: tx('Neue Ausleihe'),
                  onClick: () => crud.ausleihe.openCreate({}),
                },
              }}
            />
            <WorkList
              title={tx('Wartung & Reparatur')}
              items={openWartung
                .sort((a, b) => {
                  const aDate = a.fields.geplantes_datum ?? a.fields.meldedatum ?? '';
                  const bDate = b.fields.geplantes_datum ?? b.fields.meldedatum ?? '';
                  return aDate.localeCompare(bDate);
                })
                .slice(0, 6)
                .map(w => {
                  const status = lookupKey(w.fields.vorgang_status);
                  const typ = w.fields.vorgangstyp?.label;
                  return {
                    id: w.record_id,
                    title: w.werkzeug_wrName || tx('Unbekanntes Werkzeug'),
                    secondLine: (
                      <>
                        <span className={status === 'offen' ? 'font-medium text-amber-600' : 'font-medium text-primary'}>
                          {w.fields.vorgang_status?.label}
                        </span>
                        {typ && <span className="text-muted-foreground"> · {typ}</span>}
                        {w.fields.geplantes_datum && (
                          <span className="text-muted-foreground"> · {formatDate(w.fields.geplantes_datum)}</span>
                        )}
                      </>
                    ),
                    action: status === 'offen'
                      ? { label: tx('Starten'), onClick: () => advanceWartung(w) }
                      : { label: tx('Abschließen'), onClick: () => closeWartung(w) },
                  };
                })}
              onItemClick={id => {
                const w = enrichedWartungReparatur.find(x => x.record_id === id);
                if (w) crud.wartungReparatur.openDetail(w);
              }}
              empty={{
                text: tx('Kein offener Wartungs- oder Reparaturbedarf'),
                action: {
                  label: tx('Vorgang melden'),
                  onClick: () => crud.wartungReparatur.openCreate({}),
                },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
