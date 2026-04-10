import type { EmissionenSchnelleingabe, GhgBerichtsuebersicht, Scope1DirekteEmissionen, Scope2IndirekteEnergieemissionen, Scope3WeitereIndirekteEmissionen } from './app';

export type EnrichedScope1DirekteEmissionen = Scope1DirekteEmissionen & {
  s1_einheitName: string;
  s1_berichtsjahrName: string;
  s1_emissionsfaktorName: string;
};

export type EnrichedScope2IndirekteEnergieemissionen = Scope2IndirekteEnergieemissionen & {
  s2_einheitName: string;
  s2_berichtsjahrName: string;
  s2_emissionsfaktorName: string;
};

export type EnrichedEmissionenSchnelleingabe = EmissionenSchnelleingabe & {
  se_einheitName: string;
  se_berichtsjahrName: string;
  se_emissionsfaktorName: string;
};

export type EnrichedGhgBerichtsuebersicht = GhgBerichtsuebersicht & {
  gb_berichtsjahrName: string;
  gb_konzerneinheitName: string;
};

export type EnrichedScope3WeitereIndirekteEmissionen = Scope3WeitereIndirekteEmissionen & {
  s3_einheitName: string;
  s3_berichtsjahrName: string;
  s3_emissionsfaktorName: string;
};
