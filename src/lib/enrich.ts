import type { EnrichedAusleihe, EnrichedWartungReparatur } from '@/types/enriched';
import type { Ausleihe, Handwerker, WartungReparatur, Werkzeuge } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface AusleiheMaps {
  handwerkerMap: Map<string, Handwerker>;
  werkzeugeMap: Map<string, Werkzeuge>;
}

export function enrichAusleihe(
  ausleihe: Ausleihe[],
  maps: AusleiheMaps
): EnrichedAusleihe[] {
  return ausleihe.map(r => ({
    ...r,
    handwerkerName: resolveDisplay(r.fields.handwerker, maps.handwerkerMap, 'vorname', 'nachname'),
    werkzeugName: resolveDisplay(r.fields.werkzeug, maps.werkzeugeMap, 'werkzeugname'),
  }));
}

interface WartungReparaturMaps {
  werkzeugeMap: Map<string, Werkzeuge>;
}

export function enrichWartungReparatur(
  wartungReparatur: WartungReparatur[],
  maps: WartungReparaturMaps
): EnrichedWartungReparatur[] {
  return wartungReparatur.map(r => ({
    ...r,
    werkzeug_wrName: resolveDisplay(r.fields.werkzeug_wr, maps.werkzeugeMap, 'werkzeugname'),
  }));
}
