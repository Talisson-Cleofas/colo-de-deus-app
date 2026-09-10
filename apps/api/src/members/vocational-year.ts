export const VOCATIONAL_YEARS = [
  'ANO_1',
  'ANO_2',
  'DISCIPULO',
  'POSTULANTE',
  'CONSAGRADO',
] as const;

const RESTRICTED_YEARS = new Set<string>(['ANO_1', 'ANO_2']);

export function isVocationalYear(
  vocationalYear: string | null | undefined,
  year: 'ANO_1' | 'ANO_2',
) {
  return (
    String(vocationalYear || '')
      .trim()
      .toUpperCase() === year
  );
}

export function canParticipateInMinistries(vocationalYear?: string | null) {
  return !RESTRICTED_YEARS.has(
    String(vocationalYear || '')
      .trim()
      .toUpperCase(),
  );
}
