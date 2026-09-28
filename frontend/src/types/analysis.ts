export type ReportPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export interface ReportItem { title: string; description: string; priority: ReportPriority }
export interface ReportResult { summary: string; technologies: string[]; architecture: string; problems: ReportItem[]; securityRisks: ReportItem[]; recommendations: ReportItem[]; modernization: string[] }
export interface Analysis { id: string; projectId: string; provider: string; status: 'PENDING'|'PROCESSING'|'COMPLETED'|'FAILED'; createdAt: string; completedAt: string | null; errorMessage: string | null; result: ReportResult | null }
export interface AnalysisSummary { id:string; provider:string; status:Analysis['status']; createdAt:string; completedAt:string|null; errorMessage:string|null }
