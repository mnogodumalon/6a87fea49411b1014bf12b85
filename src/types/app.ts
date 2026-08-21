import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Handwerker {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    personalnummer?: string;
    telefon?: string;
    email?: string;
    abteilung?: string;
    status?: LookupValue;
  };
}

export interface Werkzeuge {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeugname?: string;
    inventarnummer?: string;
    kategorie?: LookupValue;
    hersteller?: string;
    modell?: string;
    kaufdatum?: string; // Format: YYYY-MM-DD oder ISO String
    standort?: string;
    werkzeug_status?: LookupValue;
    bemerkungen_werkzeug?: string;
    foto?: string;
  };
}

export interface Ausleihe {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    handwerker?: string; // applookup -> URL zu 'Handwerker' Record
    werkzeug?: string; // applookup -> URL zu 'Werkzeuge' Record
    ausleihdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplantes_rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    tatsaechliches_rueckgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    zustand_ausleihe?: LookupValue;
    zustand_rueckgabe?: LookupValue;
    bemerkungen_ausleihe?: string;
  };
}

export interface WartungReparatur {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    werkzeug_wr?: string; // applookup -> URL zu 'Werkzeuge' Record
    vorgangstyp?: LookupValue;
    meldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    geplantes_datum?: string; // Format: YYYY-MM-DD oder ISO String
    abschlussdatum?: string; // Format: YYYY-MM-DD oder ISO String
    beschreibung?: string;
    durchfuehrende_stelle?: LookupValue;
    kosten?: number;
    vorgang_status?: LookupValue;
    bemerkungen_wartung?: string;
  };
}

export const APP_IDS = {
  HANDWERKER: '6a87fe826c8ec89f34aa912b',
  WERKZEUGE: '6a87fe8737fd8fb6dc82a473',
  AUSLEIHE: '6a87fe8867dedae6430bfa19',
  WARTUNG_REPARATUR: '6a87fe8905f464a9fae1a8fc',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'handwerker': {
    status: [{ key: "aktiv", get label() { return lookupLabel('handwerker', 'status', "aktiv") ?? "Aktiv"; } }, { key: "inaktiv", get label() { return lookupLabel('handwerker', 'status', "inaktiv") ?? "Inaktiv"; } }],
  },
  'werkzeuge': {
    kategorie: [{ key: "elektrowerkzeug", get label() { return lookupLabel('werkzeuge', 'kategorie', "elektrowerkzeug") ?? "Elektrowerkzeug"; } }, { key: "messgeraet", get label() { return lookupLabel('werkzeuge', 'kategorie', "messgeraet") ?? "Messgerät"; } }, { key: "pruefgeraet", get label() { return lookupLabel('werkzeuge', 'kategorie', "pruefgeraet") ?? "Prüfgerät"; } }, { key: "handwerkzeug", get label() { return lookupLabel('werkzeuge', 'kategorie', "handwerkzeug") ?? "Handwerkzeug"; } }, { key: "sonstiges", get label() { return lookupLabel('werkzeuge', 'kategorie', "sonstiges") ?? "Sonstiges"; } }],
    werkzeug_status: [{ key: "verfuegbar", get label() { return lookupLabel('werkzeuge', 'werkzeug_status', "verfuegbar") ?? "Verfügbar"; } }, { key: "ausgeliehen", get label() { return lookupLabel('werkzeuge', 'werkzeug_status', "ausgeliehen") ?? "Ausgeliehen"; } }, { key: "in_wartung", get label() { return lookupLabel('werkzeuge', 'werkzeug_status', "in_wartung") ?? "In Wartung"; } }, { key: "in_reparatur", get label() { return lookupLabel('werkzeuge', 'werkzeug_status', "in_reparatur") ?? "In Reparatur"; } }, { key: "ausser_betrieb", get label() { return lookupLabel('werkzeuge', 'werkzeug_status', "ausser_betrieb") ?? "Außer Betrieb"; } }],
  },
  'ausleihe': {
    zustand_ausleihe: [{ key: "einwandfrei", get label() { return lookupLabel('ausleihe', 'zustand_ausleihe', "einwandfrei") ?? "Einwandfrei"; } }, { key: "leichte_spuren", get label() { return lookupLabel('ausleihe', 'zustand_ausleihe', "leichte_spuren") ?? "Leichte Gebrauchsspuren"; } }, { key: "starke_spuren", get label() { return lookupLabel('ausleihe', 'zustand_ausleihe', "starke_spuren") ?? "Starke Gebrauchsspuren"; } }, { key: "beschaedigt", get label() { return lookupLabel('ausleihe', 'zustand_ausleihe', "beschaedigt") ?? "Beschädigt"; } }],
    zustand_rueckgabe: [{ key: "einwandfrei_r", get label() { return lookupLabel('ausleihe', 'zustand_rueckgabe', "einwandfrei_r") ?? "Einwandfrei"; } }, { key: "leichte_spuren_r", get label() { return lookupLabel('ausleihe', 'zustand_rueckgabe', "leichte_spuren_r") ?? "Leichte Gebrauchsspuren"; } }, { key: "starke_spuren_r", get label() { return lookupLabel('ausleihe', 'zustand_rueckgabe', "starke_spuren_r") ?? "Starke Gebrauchsspuren"; } }, { key: "beschaedigt_r", get label() { return lookupLabel('ausleihe', 'zustand_rueckgabe', "beschaedigt_r") ?? "Beschädigt"; } }],
  },
  'wartung_reparatur': {
    vorgangstyp: [{ key: "reparatur", get label() { return lookupLabel('wartung_reparatur', 'vorgangstyp', "reparatur") ?? "Reparatur"; } }, { key: "wartung", get label() { return lookupLabel('wartung_reparatur', 'vorgangstyp', "wartung") ?? "Wartung"; } }],
    durchfuehrende_stelle: [{ key: "intern", get label() { return lookupLabel('wartung_reparatur', 'durchfuehrende_stelle', "intern") ?? "Intern"; } }, { key: "extern", get label() { return lookupLabel('wartung_reparatur', 'durchfuehrende_stelle', "extern") ?? "Extern"; } }],
    vorgang_status: [{ key: "offen", get label() { return lookupLabel('wartung_reparatur', 'vorgang_status', "offen") ?? "Offen"; } }, { key: "in_bearbeitung", get label() { return lookupLabel('wartung_reparatur', 'vorgang_status', "in_bearbeitung") ?? "In Bearbeitung"; } }, { key: "abgeschlossen", get label() { return lookupLabel('wartung_reparatur', 'vorgang_status', "abgeschlossen") ?? "Abgeschlossen"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'handwerker': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'personalnummer': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'abteilung': 'string/text',
    'status': 'lookup/radio',
  },
  'werkzeuge': {
    'werkzeugname': 'string/text',
    'inventarnummer': 'string/text',
    'kategorie': 'lookup/select',
    'hersteller': 'string/text',
    'modell': 'string/text',
    'kaufdatum': 'date/date',
    'standort': 'string/text',
    'werkzeug_status': 'lookup/select',
    'bemerkungen_werkzeug': 'string/textarea',
    'foto': 'file',
  },
  'ausleihe': {
    'handwerker': 'applookup/select',
    'werkzeug': 'applookup/select',
    'ausleihdatum': 'date/datetimeminute',
    'geplantes_rueckgabedatum': 'date/date',
    'tatsaechliches_rueckgabedatum': 'date/date',
    'zustand_ausleihe': 'lookup/select',
    'zustand_rueckgabe': 'lookup/select',
    'bemerkungen_ausleihe': 'string/textarea',
  },
  'wartung_reparatur': {
    'werkzeug_wr': 'applookup/select',
    'vorgangstyp': 'lookup/radio',
    'meldedatum': 'date/date',
    'geplantes_datum': 'date/date',
    'abschlussdatum': 'date/date',
    'beschreibung': 'string/textarea',
    'durchfuehrende_stelle': 'lookup/radio',
    'kosten': 'number',
    'vorgang_status': 'lookup/select',
    'bemerkungen_wartung': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

// Aliases for the pre-0.0.279 app keys (see 4c).
LOOKUP_OPTIONS['wartung_&_reparatur'] = LOOKUP_OPTIONS['wartung_reparatur'];
FIELD_TYPES['wartung_&_reparatur'] = FIELD_TYPES['wartung_reparatur'];

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateHandwerker = StripLookup<Handwerker['fields']>;
export type CreateWerkzeuge = StripLookup<Werkzeuge['fields']>;
export type CreateAusleihe = StripLookup<Ausleihe['fields']>;
export type CreateWartungReparatur = StripLookup<WartungReparatur['fields']>;