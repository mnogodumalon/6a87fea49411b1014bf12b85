/**
 * Werkzeug-Rückgabe — 2-Schritt-Wizard.
 * Steps: 1) Offene Ausleihe wählen → 2) Rückgabe erfassen & Werkzeugstatus aktualisieren.
 * Reads: ausleihe, handwerker, werkzeuge. Writes: ausleihe (updateAusleiheEntry), werkzeuge (updateWerkzeugeEntry).
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconArrowRight, IconCheck, IconTool } from '@tabler/icons-react';
import { tx } from '@/i18n';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAusleihe } from '@/lib/enrich';
import type { EnrichedAusleihe } from '@/types/enriched';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function WerkzeugRueckgabePage() {
  const data = useDashboardData();
  const { ausleihe, handwerkerMap, werkzeugeMap, loading, error, fetchAll } = data;

  const [step, setStep] = useState(1);
  const [selectedAusleihe, setSelectedAusleihe] = useState<EnrichedAusleihe | null>(null);
  const [rueckgabedatum, setRueckgabedatum] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [zustandKey, setZustandKey] = useState('');
  const [bemerkungen, setBemerkungen] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const enrichedAusleihe = enrichAusleihe(ausleihe, { handwerkerMap, werkzeugeMap });

  const offeneAusleihen = enrichedAusleihe.filter(
    (a) => !a.fields.tatsaechliches_rueckgabedatum
  );

  const ZUSTAND_OPTIONS = LOOKUP_OPTIONS['ausleihe']?.['zustand_rueckgabe'] ?? [];

  const handleSelectAusleihe = (id: string) => {
    const found = enrichedAusleihe.find((a) => a.record_id === id);
    if (found) {
      setSelectedAusleihe(found);
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAusleihe) return;
    setSaving(true);
    setSaveError(null);
    try {
      await LivingAppsService.updateAusleiheEntry(selectedAusleihe.record_id, {
        tatsaechliches_rueckgabedatum: rueckgabedatum,
        zustand_rueckgabe: zustandKey || undefined,
        bemerkungen_ausleihe: bemerkungen || undefined,
      });

      const werkzeugId = extractRecordId(selectedAusleihe.fields.werkzeug);
      if (werkzeugId) {
        await LivingAppsService.updateWerkzeugeEntry(werkzeugId, {
          werkzeug_status: 'verfuegbar',
        });
      }

      await fetchAll();
      setDone(true);
    } catch (e) {
      setSaveError(tx('Fehler beim Speichern. Bitte erneut versuchen.'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedAusleihe(null);
    setRueckgabedatum(format(new Date(), 'yyyy-MM-dd'));
    setZustandKey('');
    setBemerkungen('');
    setSaveError(null);
    setDone(false);
  };

  return (
    <IntentWizardShell
      title={tx('Werkzeug zurückgeben')}
      subtitle={tx('Ausleihe abschliessen und Werkzeugstatus aktualisieren')}
      steps={[{ label: tx('Ausleihe wählen') }, { label: tx('Rückgabe erfassen') }]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Ausleihe wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={offeneAusleihen.map((a) => ({
            id: a.record_id,
            title: a.werkzeugName || tx('Unbekanntes Werkzeug'),
            subtitle: [
              a.handwerkerName,
              a.fields.ausleihdatum ? formatDate(a.fields.ausleihdatum) : null,
              a.fields.geplantes_rueckgabedatum
                ? tx('Geplante Rückgabe: ') + formatDate(a.fields.geplantes_rueckgabedatum)
                : null,
            ]
              .filter(Boolean)
              .join(' · '),
            icon: <IconTool size={20} className="text-primary" />,
          }))}
          onSelect={handleSelectAusleihe}
          searchPlaceholder={tx('Werkzeug oder Handwerker suchen …')}
          emptyText={tx('Keine offenen Ausleihen vorhanden')}
        />
      )}

      {/* Step 2: Rückgabe erfassen */}
      {step === 2 && (
        selectedAusleihe ? (
          done ? (
            <div className="flex flex-col items-center gap-6 py-12 text-center">
              <div className="rounded-full bg-emerald-100 p-4">
                <IconCheck size={36} className="text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{tx('Rückgabe erfasst')}</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedAusleihe.werkzeugName} {tx('ist wieder verfügbar.')}
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button onClick={handleReset} variant="outline" className="w-full">
                  {tx('Weitere Rückgabe erfassen')}
                </Button>
                <a href="#/" className="w-full">
                  <Button className="w-full">{tx('Zurück zum Dashboard')}</Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-lg mx-auto">
              {/* Kontext-Karte */}
              <div className="rounded-2xl border bg-card p-4 space-y-1">
                <p className="text-xs text-muted-foreground">{tx('Ausgewählte Ausleihe')}</p>
                <p className="font-semibold">{selectedAusleihe.werkzeugName}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAusleihe.handwerkerName}
                  {selectedAusleihe.fields.ausleihdatum
                    ? ' · ' + tx('Ausgeliehen: ') + formatDate(selectedAusleihe.fields.ausleihdatum)
                    : ''}
                </p>
              </div>

              {/* Felder */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rueckgabedatum">{tx('Tatsächliches Rückgabedatum')}</Label>
                  <Input
                    id="rueckgabedatum"
                    type="date"
                    value={rueckgabedatum}
                    onChange={(e) => setRueckgabedatum(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="zustand">{tx('Zustand bei Rückgabe')}</Label>
                  <Select value={zustandKey || 'none'} onValueChange={(v) => setZustandKey(v === 'none' ? '' : v)}>
                    <SelectTrigger id="zustand">
                      <SelectValue placeholder={tx('Zustand wählen …')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tx('Nicht angegeben')}</SelectItem>
                      {ZUSTAND_OPTIONS.map((opt) => (
                        <SelectItem key={opt.key} value={opt.key}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bemerkungen">{tx('Bemerkungen')}</Label>
                  <Textarea
                    id="bemerkungen"
                    value={bemerkungen}
                    onChange={(e) => setBemerkungen(e.target.value)}
                    placeholder={tx('Optionale Bemerkungen zur Rückgabe …')}
                    rows={3}
                  />
                </div>
              </div>

              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={() => setStep(1)} disabled={saving}>
                  {tx('Zurück')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving || !rueckgabedatum}
                  className="gap-2"
                >
                  {saving ? tx('Wird gespeichert …') : tx('Rückgabe bestätigen')}
                  {!saving && <IconArrowRight size={16} />}
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              {tx('Dieser Schritt braucht eine Auswahl aus Schritt 1.')}
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
