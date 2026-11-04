import { resolveBrand } from '@vyro/config';

export const brand = resolveBrand({
  name: import.meta.env.VITE_BRAND_NAME,
  tagline: import.meta.env.VITE_BRAND_TAGLINE,
});
