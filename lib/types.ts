export interface Task {
  id: string
  title: string
  status: 'Backlog' | 'À faire' | 'En cours' | 'Review' | 'Done'
  priority: 'P0' | 'P1' | 'P2' | ''
  module: 'Produit' | 'Marketing' | 'Prospection' | 'Ops' | ''
  description: string
  dateStart: string
  dateEnd: string
  assignedTo: string
  modifiedBy: string
  lastEdited: string
  createdAt: string
}

export interface CRMEntry {
  id: string
  enseigne: string
  contact: string
  email: string
  phone: string
  ville: string
  status: 'À contacter' | 'Contacté' | 'RDV pris' | 'Offre envoyée' | 'Client' | 'Refus'
  canal: string
  type: string
  priority: 'Haute' | 'Moyenne' | 'Basse' | ''
  notes: string
  lastContact: string
  nextFollowup: string
  assignedTo: string
  modifiedBy: string
  lastEdited: string
}

export interface Idea {
  id: string
  title: string
  description: string
  status: 'Brute' | 'À explorer' | 'Validée' | 'Rejetée'
  category: string
  effort: 'Faible' | 'Moyen' | 'Élevé' | ''
  votes: number
  assignedTo: string
  modifiedBy: string
  lastEdited: string
}

export interface CalendarEvent {
  id: string
  title: string
  dateStart: string
  dateEnd: string
  type: 'RDV' | 'Réunion' | 'Appel' | 'Deadline' | 'Autre'
  description: string
  modifiedBy: string
  source: 'supabase' | 'google' | 'external'
  color?: string
}

export interface KPIData {
  tasksInProgress: number
  activeProspects: number
  signedClients: number
  validatedIdeas: number
  totalTasks: number
  totalCRM: number
  totalIdeas: number
  tasksByStatus: Record<string, number>
  recentTasks: Task[]
  urgentTasks: Task[]
  overdueCount: number
  topIdeas: Idea[]
  // métriques 24h
  tasksLast24h: number
  tasksPrev24h: number
  tasksDelta: number
  completedLast24h: number
  completionRate: number
  crmConversionRate: number
  taskVelocity: number
}
