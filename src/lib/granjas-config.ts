export interface GalponConfig {
  id: string;
  nombre: string;
}

export interface GranjaConfig {
  id: string;
  nombre: string;
  galpones: GalponConfig[];
}

export const MAESTRO_GRANJAS: GranjaConfig[] = [
  {
    id: 'granja-1',
    nombre: 'Granja La Principal',
    galpones: [
      { id: 'g1-1', nombre: 'Galpón 1' },
      { id: 'g1-2', nombre: 'Galpón 2' },
      { id: 'g1-3', nombre: 'Galpón 3' },
      { id: 'g1-4', nombre: 'Galpón 4' },
    ],
  },
  {
    id: 'granja-2',
    nombre: 'Granja La Esperanza',
    galpones: [
      { id: 'g2-1', nombre: 'Galpón A' },
      { id: 'g2-2', nombre: 'Galpón B' },
      { id: 'g2-3', nombre: 'Galpón C' },
    ],
  },
];
