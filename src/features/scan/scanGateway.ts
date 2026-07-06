import { fetchResolve, fetchResolveByCode } from '../../api/pickupApi.js';
import type { IScanGateway } from './IScanGateway.js';

export const scanGateway: IScanGateway = {
  resolve: fetchResolve,
  resolveByCode: fetchResolveByCode,
};
