import { api } from './api';

export async function deleteAnalysis(id: string): Promise<void> {
  await api.delete(`/analyses/${id}`);
}
