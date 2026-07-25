export type Coordinates = { latitude: number; longitude: number };
export type MapMarkerDto = Coordinates & {
  id: string;
  title: string;
  description?: string;
  address?: string;
  category: 'MEMBER' | 'CELL' | 'CENACLE' | 'EVENT';
  navigationUrl: string;
  metadata?: Record<string, string>;
};
export type MapsStatus = { enabled: boolean; configured: boolean; message: string };
