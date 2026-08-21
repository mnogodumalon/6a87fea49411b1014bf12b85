/**
 * Werkzeug Ausleihen — 3-Schritt-Wizard.
 * Steps: 1) Verfügbares Werkzeug wählen → 2) Aktiven Handwerker wählen → 3) Ausleihe bestätigen & anlegen.
 * Reads: werkzeuge (gefiltert auf verfuegbar), handwerker (gefiltert auf aktiv).
 * Writes: ausleihe (createAusleiheEntry), werkzeuge (updateWerkzeugeEntry → status 'ausgeliehen').
 * Composes: IntentWizardShell, EntitySelectStep.
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { IconTool, IconUser, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Werkzeuge, Handwerker } from '@/types/app';
import { tx } from '@/i18n';

export default function WerkzeugAusleihenPage() {
  const { werkzeuge, handwerker, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedWerkzeug, setSelectedWerkzeug] = useState<Werkzeuge | null>(null);
  const [selectedHandwerker, setSelectedHandwerker] = useState<Handwerker | null>(null);

  // Step 3 form state
  const [ausleihdatum, setAusleihdatum] = useState(() =>
    format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [geplantesRueckgabedatum, setGeplantesRueckgabedatum] = useState('');
  const [zustandKey, setZustandKey] = useState('none');
  const [bemerkungen, setBemerkungen] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ZUSTAND_OPTIONS = LOOKUP_OPTIONS['ausleihe']?.['zustand_ausleihe'] ?? [];

  const verfuegbareWerkzeuge = werkzeuge.filter(
    (w) => w.fields.werkzeug_status?.key === 'verfuegbar'
  );

  const aktiveHandwerker = handwerker.filter(
    (h) => h.fields.status?.key === 'aktiv'
  );

  const handleWerkzeugSelect = (id: string) => {
    const found = werkzeuge.find((w) => w.record_id === id) ?? null;
    setSelectedWerkzeug(found);
    setStep(2);
  };

  const handleHandwerkerSelect = (id: string) => {
    const found = handwerker.find((h) => h.record_id === id) ?? null;
    setSelectedHandwerker(found);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!selectedWerkzeug || !selectedHandwerker) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await LivingAppsService.createAusleiheEntry({
        handwerker: createRecordUrl(APP_IDS.HANDWERKER, selectedHandwerker.record_id),
        werkzeug: createRecordUrl(APP_IDS.WERKZEUGE, selectedWerkzeug.record_id),
        ausleihdatum,
        geplantes_rueckgabedatum: geplantesRueckgabedatum || undefined,
        zustand_ausleihe: zustandKey !== 'none' ? zustandKey : undefined,
        bemerkungen_ausleihe: bemerkungen || undefined,
      });
      await LivingAppsService.updateWerkzeugeEntry(selectedWerkzeug.record_id, {
        werkzeug_status: 'ausgeliehen',
      });
      await fetchAll();
      setSuccess(true);
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : tx('Unbekannter Fehler beim Speichern.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedWerkzeug(null);
    setSelectedHandwerker(null);
    setAusleihdatum(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setGeplantesRueckgabedatum('');
    setZustandKey('none');
    setBemerkungen('');
    setSubmitError(null);
    setSuccess(false);
    setStep(1);
  };

  if (success) {
    return (
      <IntentWizardShell
        title={tx('Werkzeug ausleihen')}
        subtitle={tx('Ausleihe erfolgreich angelegt')}
        steps={[
          { label: tx('Werkzeug') },
          { label: tx('Handwerker') },
          { label: tx('Bestätigen') },
        ]}
        currentStep={3}
        onStepChange={setStep}
        loading={false}
        error={null}
        onRetry={fetchAll}
      >
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="rounded-full bg-emerald-100 p-5">
            <IconCheck size={40} className="text-emerald-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              {tx('Ausleihe erfolgreich!')}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {tx('Das Werkzeug wurde als ausgeliehen markiert und der Ausleihe-Eintrag wurde angelegt.')}
            </p>
          </div>
          <div className="rounded-2xl border bg-card p-4 w-full max-w-sm space-y-2">
            <div className="flex items-center gap-2">
              <IconTool size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">
                {selectedWerkzeug?.fields.werkzeugname ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IconUser size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {[selectedHandwerker?.fields.vorname, selectedHandwerker?.fields.nachname]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <Button className="flex-1" onClick={handleReset}>
              {tx('Neue Ausleihe anlegen')}
            </Button>
            <Button variant="outline" className="flex-1" asChild>
              <a href="#/">{tx('Zurück zum Dashboard')}</a>
            </Button>
          </div>
        </div>
      </IntentWizardShell>
    );
  }

  return (
    <IntentWizardShell
      title={tx('Werkzeug ausleihen')}
      subtitle={tx('Verfügbares Werkzeug in 3 Schritten an einen Handwerker ausleihen')}
      steps={[
        { label: tx('Werkzeug') },
        { label: tx('Handwerker') },
        { label: tx('Bestätigen') },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Werkzeug wählen */}
      {step === 1 && (
        <EntitySelectStep
          items={verfuegbareWerkzeuge.map((w) => ({
            id: w.record_id,
            title: w.fields.werkzeugname ?? tx('Unbenanntes Werkzeug'),
            subtitle: [
              w.fields.inventarnummer ? tx`Nr. ${w.fields.inventarnummer}` : null,
              w.fields.standort ?? null,
            ]
              .filter(Boolean)
              .join(' · '),
            status: w.fields.werkzeug_status
              ? { key: w.fields.werkzeug_status.key, label: w.fields.werkzeug_status.label }
              : undefined,
            stats: [
              { label: tx('Kategorie'), value: w.fields.kategorie?.label ?? '—' },
              { label: tx('Inventar-Nr.'), value: w.fields.inventarnummer ?? '—' },
            ],
            icon: <IconTool size={20} className="text-primary" />,
          }))}
          onSelect={handleWerkzeugSelect}
          searchPlaceholder={tx('Werkzeug suchen …')}
          emptyText={tx('Keine verfügbaren Werkzeuge gefunden')}
          emptyIcon={<IconTool size={32} className="text-muted-foreground" />}
        />
      )}

      {/* Step 2: Handwerker wählen */}
      {step === 2 && (
        <div className="space-y-4">
          {selectedWerkzeug ? (
            <>
              <div className="rounded-2xl border bg-card p-3 flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                  <IconTool size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{tx('Ausgewähltes Werkzeug')}</p>
                  <p className="text-sm font-medium truncate">
                    {selectedWerkzeug.fields.werkzeugname ?? '—'}
                  </p>
                  {selectedWerkzeug.fields.inventarnummer && (
                    <p className="text-xs text-muted-foreground truncate">
                      {tx('Nr.')} {selectedWerkzeug.fields.inventarnummer}
                    </p>
                  )}
                </div>
                <StatusBadge
                  statusKey={selectedWerkzeug.fields.werkzeug_status?.key}
                  label={selectedWerkzeug.fields.werkzeug_status?.label}
                  className="ml-auto shrink-0"
                />
              </div>
              <EntitySelectStep
                items={aktiveHandwerker.map((h) => ({
                  id: h.record_id,
                  title: [h.fields.vorname, h.fields.nachname].filter(Boolean).join(' ') || tx('Unbekannt'),
                  subtitle: [
                    h.fields.personalnummer ? tx`Pers.-Nr. ${h.fields.personalnummer}` : null,
                    h.fields.abteilung ?? null,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  status: h.fields.status
                    ? { key: h.fields.status.key, label: h.fields.status.label }
                    : undefined,
                  stats: [
                    { label: tx('Abteilung'), value: h.fields.abteilung ?? '—' },
                    { label: tx('Personal-Nr.'), value: h.fields.personalnummer ?? '—' },
                  ],
                  icon: <IconUser size={20} className="text-primary" />,
                }))}
                onSelect={handleHandwerkerSelect}
                searchPlaceholder={tx('Handwerker suchen …')}
                emptyText={tx('Keine aktiven Handwerker gefunden')}
                emptyIcon={<IconUser size={32} className="text-muted-foreground" />}
              />
            </>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">
                {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
              </p>
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Neu starten')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Ausleihe bestätigen */}
      {step === 3 && (
        <div className="space-y-6">
          {selectedWerkzeug && selectedHandwerker ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-card p-3 flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                    <IconTool size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{tx('Werkzeug')}</p>
                    <p className="text-sm font-medium truncate">
                      {selectedWerkzeug.fields.werkzeugname ?? '—'}
                    </p>
                    {selectedWerkzeug.fields.kategorie && (
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedWerkzeug.fields.kategorie.label}
                      </p>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border bg-card p-3 flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                    <IconUser size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{tx('Handwerker')}</p>
                    <p className="text-sm font-medium truncate">
                      {[selectedHandwerker.fields.vorname, selectedHandwerker.fields.nachname]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </p>
                    {selectedHandwerker.fields.abteilung && (
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedHandwerker.fields.abteilung}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ausleihe details form */}
              <div className="rounded-2xl border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {tx('Ausleih-Details')}
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="ausleihdatum" className="text-sm">
                    {tx('Ausleihdatum')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ausleihdatum"
                    type="datetime-local"
                    value={ausleihdatum}
                    onChange={(e) => setAusleihdatum(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rueckgabedatum" className="text-sm">
                    {tx('Geplantes Rückgabedatum')}
                  </Label>
                  <Input
                    id="rueckgabedatum"
                    type="date"
                    value={geplantesRueckgabedatum}
                    onChange={(e) => setGeplantesRueckgabedatum(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zustand" className="text-sm">
                    {tx('Zustand bei Ausleihe')}
                  </Label>
                  <Select value={zustandKey} onValueChange={setZustandKey}>
                    <SelectTrigger id="zustand" className="w-full">
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

                <div className="space-y-2">
                  <Label htmlFor="bemerkungen" className="text-sm">
                    {tx('Bemerkungen')}
                  </Label>
                  <Textarea
                    id="bemerkungen"
                    value={bemerkungen}
                    onChange={(e) => setBemerkungen(e.target.value)}
                    placeholder={tx('Optionale Hinweise zur Ausleihe …')}
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>
              </div>

              {submitError && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-2">
                  <IconAlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                >
                  {tx('Zurück')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={submitting || !ausleihdatum}
                >
                  {submitting ? tx('Wird gespeichert …') : tx('Ausleihe anlegen')}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">
                {tx('Dieser Schritt braucht die Auswahl aus Schritt 1 und 2.')}
              </p>
              <Button variant="outline" onClick={() => setStep(1)}>
                {tx('Neu starten')}
              </Button>
            </div>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
