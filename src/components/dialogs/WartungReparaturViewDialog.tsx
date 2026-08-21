import type { WartungReparatur, Werkzeuge } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

interface WartungReparaturViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: WartungReparatur | null;
  onEdit: (record: WartungReparatur) => void;
  werkzeugeList: Werkzeuge[];
}

export function WartungReparaturViewDialog({ open, onClose, record, onEdit, werkzeugeList }: WartungReparaturViewDialogProps) {
  function getWerkzeugeDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return werkzeugeList.find(r => r.record_id === id)?.fields.werkzeugname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('wartung_reparatur') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'werkzeug_wr')}</Label>
            <p className="text-sm">{getWerkzeugeDisplayName(record.fields.werkzeug_wr)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'vorgangstyp')}</Label>
            <Badge variant="secondary">{lookupLabel('wartung_reparatur', 'vorgangstyp', record.fields.vorgangstyp?.key) ?? record.fields.vorgangstyp?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'meldedatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.meldedatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'geplantes_datum')}</Label>
            <p className="text-sm">{formatDate(record.fields.geplantes_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'abschlussdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.abschlussdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'beschreibung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'durchfuehrende_stelle')}</Label>
            <Badge variant="secondary">{lookupLabel('wartung_reparatur', 'durchfuehrende_stelle', record.fields.durchfuehrende_stelle?.key) ?? record.fields.durchfuehrende_stelle?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'kosten')}</Label>
            <p className="text-sm">{record.fields.kosten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'vorgang_status')}</Label>
            <Badge variant="secondary">{lookupLabel('wartung_reparatur', 'vorgang_status', record.fields.vorgang_status?.key) ?? record.fields.vorgang_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('wartung_reparatur', 'bemerkungen_wartung')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bemerkungen_wartung ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.WARTUNG_REPARATUR} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}