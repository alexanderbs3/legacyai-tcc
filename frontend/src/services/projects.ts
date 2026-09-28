import { api } from './api'

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/projects/${id}`)
}
