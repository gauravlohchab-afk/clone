import { createSocialApi } from '@vyro/shared';
import { api } from './api';

export { followLabel, type ConnectionKind } from '@vyro/shared';
export const social = createSocialApi(api);
