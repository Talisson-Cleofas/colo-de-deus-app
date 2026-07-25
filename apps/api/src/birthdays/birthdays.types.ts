export type BirthdayItem = {
  id: string;
  name: string;
  photo: string;
  day: number;
  month: number;
  age?: number;
  isToday: boolean;
  daysUntil: number;
  city: string;
  state: string;
  ministryIds: string[];
  ministryNames: string[];
  cellIds: string[];
  cellNames: string[];
  cenacleIds: string[];
  cenacleNames: string[];
};
