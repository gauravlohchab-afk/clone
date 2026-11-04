import { resolveBrand } from '@vyro/config';

export const brand = resolveBrand({
  name: process.env.EXPO_PUBLIC_BRAND_NAME,
  tagline: process.env.EXPO_PUBLIC_BRAND_TAGLINE,
});
