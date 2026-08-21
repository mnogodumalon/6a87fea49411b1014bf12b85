import type { Ausleihe, WartungReparatur } from './app';

export type EnrichedAusleihe = Ausleihe & {
  handwerkerName: string;
  werkzeugName: string;
};

export type EnrichedWartungReparatur = WartungReparatur & {
  werkzeug_wrName: string;
};
