/**
 * Wartung melden — 2-Schritt-Wizard.
 * Steps: 1) Werkzeug wählen → 2) Vorgang erfassen & speichern.
 * Reads: werkzeuge. Writes: wartung_reparatur (createWartungReparaturEntry),
 *        werkzeuge (updateWerkzeugeEntry — setzt werkzeug_status auf in_wartung / in_reparatur).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Werkzeuge } from '@/types/app';
import { tx } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  IconTool,
  IconAlertTriangle,
  IconCircleCheck,
  IconSettings,
} from '@tabler/icons-react';

export default function WartungMeldenPage() {
  const data = useDashboardData();
  const { werkzeuge, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedWerkzeug, setSelectedWerkzeug] = useState<Werkzeuge | null>(null);

  // Step 2 form state
  const VORGANGSTYP_OPTIONS = LOOKUP_OPTIONS['wartung_reparatur']?.['vorgangstyp'] ?? [];
  const DURCHFUEHRENDE_OPTIONS = LOOKUP_OPTIONS['wartung_reparatur']?.['durchfuehrende_stelle'] ?? [];

  const [vorgangstyp, setVorgangstyp] = useState(VORGANGSTYP_OPTIONS[0]?.key ?? 'reparatur');
  const [meldedatum, setMeldedatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [geplantesDatum, setGeplantesDatum] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [durchfuehrendeStelleKey, setDurchfuehrendeStelleKey] = useState(DURCHFUEHRENDE_OPTIONS[0]?.key ?? 'intern');
  const [kosten, setKosten] = useState('');
  const [bemerkungenWartung, setBemerkungenWartung] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // eligible: alle Werkzeuge außer ausser_betrieb
  const eligibleWerkzeuge = werkzeuge.filter(
    (w) => w.fields.werkzeug_status?.key !== 'ausser_betrieb',
  );

  const handleWerkzeugSelect = (id: string) => {
    const found = werkzeuge.find((w) => w.record_id === id);
    if (found) {
      setSelectedWerkzeug(found);
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!selectedWerkzeug) return;
    if (!beschreibung.trim()) {
      setSubmitError(tx('Bitte eine Beschreibung eingeben.'));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const newStatus = vorgangstyp === 'reparatur' ? 'in_reparatur' : 'in_wartung';

      await LivingAppsService.createWartungReparaturEntry({
        werkzeug_wr: createRecordUrl(APP_IDS.WERKZEUGE, selectedWerkzeug.record_id),
        vorgangstyp,
        meldedatum,
        geplantes_datum: geplantesDatum || undefined,
        beschreibung: beschreibung.trim(),
        durchfuehrende_stelle: durchfuehrendeStelleKey,
        kosten: kosten ? parseFloat(kosten) : undefined,
        vorgang_status: 'offen',
        bemerkungen_wartung: bemerkungenWartung.trim() || undefined,
      });

      await LivingAppsService.updateWerkzeugeEntry(selectedWerkzeug.record_id, {
        werkzeug_status: newStatus,
      });

      await fetchAll();
      setDone(true);
    } catch (e) {
      setSubmitError(tx('Fehler beim Speichern. Bitte erneut versuchen.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedWerkzeug(null);
    setVorgangstyp(VORGANGSTYP_OPTIONS[0]?.key ?? 'reparatur');
    setMeldedatum(format(new Date(), 'yyyy-MM-dd'));
    setGeplantesDatum('');
    setBeschreibung('');
    setDurchfuehrendeStelleKey(DURCHFUEHRENDE_OPTIONS[0]?.key ?? 'intern');
    setKosten('');
    setBemerkungenWartung('');
    setSubmitError(null);
    setDone(false);
    setStep(1);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8">
        <div className="rounded-full bg-emerald-100 p-5">
          <IconCircleCheck size={48} className="text-emerald-600" stroke={1.5} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">{tx('Vorgang gemeldet')}</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            {tx('Der Wartungs- oder Reparaturvorgang wurde erfasst und der Werkzeugstatus aktualisiert.')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleReset} variant="outline">
            {tx('Weiteres Werkzeug melden')}
          </Button>
          <a href="#/">
            <Button>{tx('Zurück zum Dashboard')}</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Wartung / Reparatur melden')}
      subtitle={tx('Werkzeug auswählen und Vorgang dokumentieren')}
      steps={[{ label: tx('Werkzeug wählen') }, { label: tx('Vorgang erfassen') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── Step 1: Werkzeug wählen ─────────────────────────────────────── */}
      {step === 1 && (
        <EntitySelectStep
          items={eligibleWerkzeuge.map((w) => ({
            id: w.record_id,
            title: w.fields.werkzeugname ?? tx('(kein Name)'),
            subtitle: [
              w.fields.inventarnummer ? `#${w.fields.inventarnummer}` : null,
              w.fields.kategorie?.label,
              w.fields.standort ? `📍 ${w.fields.standort}` : null,
            ]
              .filter(Boolean)
              .join(' · '),
            status: w.fields.werkzeug_status
              ? { key: w.fields.werkzeug_status.key, label: w.fields.werkzeug_status.label }
              : undefined,
            icon: <IconTool size={20} className="text-primary" />,
          }))}
          onSelect={handleWerkzeugSelect}
          searchPlaceholder={tx('Werkzeug suchen …')}
          emptyText={tx('Kein Werkzeug gefunden')}
          emptyIcon={<IconTool size={32} className="text-muted-foreground" />}
        />
      )}

      {/* ── Step 2: Vorgang erfassen ────────────────────────────────────── */}
      {step === 2 && (
        selectedWerkzeug ? (
          <div className="space-y-6">
            {/* Ausgewähltes Werkzeug */}
            <div className="rounded-2xl border bg-secondary/40 p-4 flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                <IconTool size={20} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {selectedWerkzeug.fields.werkzeugname ?? tx('Werkzeug')}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {[
                    selectedWerkzeug.fields.inventarnummer
                      ? `#${selectedWerkzeug.fields.inventarnummer}`
                      : null,
                    selectedWerkzeug.fields.kategorie?.label,
                    selectedWerkzeug.fields.standort,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <StatusBadge
                statusKey={selectedWerkzeug.fields.werkzeug_status?.key}
                label={selectedWerkzeug.fields.werkzeug_status?.label}
              />
            </div>

            {/* Vorgangstyp */}
            <div className="space-y-2">
              <Label>{tx('Vorgangstyp')} *</Label>
              <div className="grid grid-cols-2 gap-3">
                {VORGANGSTYP_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setVorgangstyp(opt.key)}
                    className={[
                      'rounded-2xl border p-4 text-left transition-colors',
                      vorgangstyp === opt.key
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:bg-secondary/50',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      {opt.key === 'reparatur' ? (
                        <IconAlertTriangle size={18} className={vorgangstyp === opt.key ? 'text-primary' : 'text-muted-foreground'} />
                      ) : (
                        <IconSettings size={18} className={vorgangstyp === opt.key ? 'text-primary' : 'text-muted-foreground'} />
                      )}
                      <span className="font-medium text-sm">{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {opt.key === 'reparatur'
                        ? tx('Werkzeugstatus wird auf „In Reparatur" gesetzt')
                        : tx('Werkzeugstatus wird auf „In Wartung" gesetzt')}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Daten */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meldedatum">{tx('Meldedatum')} *</Label>
                <Input
                  id="meldedatum"
                  type="date"
                  value={meldedatum}
                  onChange={(e) => setMeldedatum(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geplantes_datum">{tx('Geplantes Datum')}</Label>
                <Input
                  id="geplantes_datum"
                  type="date"
                  value={geplantesDatum}
                  onChange={(e) => setGeplantesDatum(e.target.value)}
                />
              </div>
            </div>

            {/* Beschreibung */}
            <div className="space-y-2">
              <Label htmlFor="beschreibung">{tx('Beschreibung')} *</Label>
              <Textarea
                id="beschreibung"
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                placeholder={tx('Was ist defekt oder warum wird gewartet?')}
                rows={4}
              />
            </div>

            {/* Durchführende Stelle */}
            <div className="space-y-2">
              <Label>{tx('Durchführende Stelle')}</Label>
              <div className="flex flex-wrap gap-3">
                {DURCHFUEHRENDE_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setDurchfuehrendeStelleKey(opt.key)}
                    className={[
                      'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                      durchfuehrendeStelleKey === opt.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:bg-secondary/50',
                    ].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kosten */}
            <div className="space-y-2">
              <Label htmlFor="kosten">{tx('Kosten (€)')}</Label>
              <Input
                id="kosten"
                type="number"
                min="0"
                step="0.01"
                value={kosten}
                onChange={(e) => setKosten(e.target.value)}
                placeholder="0,00"
              />
            </div>

            {/* Bemerkungen */}
            <div className="space-y-2">
              <Label htmlFor="bemerkungen_wartung">{tx('Bemerkungen')}</Label>
              <Textarea
                id="bemerkungen_wartung"
                value={bemerkungenWartung}
                onChange={(e) => setBemerkungenWartung(e.target.value)}
                placeholder={tx('Weitere Hinweise …')}
                rows={3}
              />
            </div>

            {submitError && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <IconAlertTriangle size={16} className="shrink-0" />
                {submitError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                {tx('Zurück')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !beschreibung.trim()}
                className="sm:flex-1"
              >
                {submitting
                  ? tx('Wird gespeichert …')
                  : tx('Vorgang melden & Werkzeugstatus setzen')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
            </p>
            <Button variant="outline" onClick={() => setStep(1)}>
              {tx('Neu starten')}
            </Button>
          </div>
        )
      )}
    </IntentWizardShell>
  );
}
