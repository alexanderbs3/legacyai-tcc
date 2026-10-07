import { api } from './api';
import type { AnalysisSummary } from '../types/analysis';

const ANALYSIS_REQUEST_CONCURRENCY = 4;

export async function loadProjectAnalyses(
  projectIds: string[],
  signal?: AbortSignal,
): Promise<PromiseSettledResult<AnalysisSummary[]>[]> {
  const results = new Array<PromiseSettledResult<AnalysisSummary[]>>(projectIds.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < projectIds.length && !signal?.aborted) {
      const index = nextIndex++;
      try {
        const response = await api.get<AnalysisSummary[]>(
          `/projects/${projectIds[index]}/analyses`,
          { signal },
        );
        results[index] = { status: 'fulfilled', value: response.data };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const workerCount = Math.min(ANALYSIS_REQUEST_CONCURRENCY, projectIds.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function deleteAnalysis(id: string): Promise<void> {
  await api.delete(`/analyses/${id}`);
}
