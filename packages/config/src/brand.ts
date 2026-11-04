/**
 * Brand configuration. The VYRO name is provisional, so every user-facing
 * brand string must come from here (or from the VITE_/EXPO_PUBLIC_ overrides
 * that apps feed into `resolveBrand`). Never hardcode the product name in UI.
 */
export interface BrandConfig {
  name: string;
  tagline: string;
  /** Hostname the product is served on; empty until a domain is secured. */
  domain: string;
  supportEmail: string;
  colors: {
    lime: string;
    violet: string;
    coral: string;
    ink: string;
    paper: string;
  };
}

export const defaultBrand: BrandConfig = {
  name: 'VYRO',
  tagline: 'Your world. Your energy.',
  domain: '',
  supportEmail: '',
  colors: {
    lime: '#B6FF4A',
    violet: '#7558FF',
    coral: '#FF5C45',
    ink: '#11131C',
    paper: '#F4F3EF',
  },
};

export function resolveBrand(overrides: Partial<Omit<BrandConfig, 'colors'>> = {}): BrandConfig {
  const clean = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => typeof v === 'string' && v.trim() !== ''),
  );
  return { ...defaultBrand, ...clean };
}
