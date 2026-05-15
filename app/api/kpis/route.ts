import { NextResponse } from 'next/server'
import { getTasks, getCRM, getIdeas } from '@/lib/notion'

export async function GET() {
  try {
    const [tasks, crm, ideas] = await Promise.all([getTasks(), getCRM(), getIdeas()])

    const kpis = {
      tasksInProgress: tasks.filter(t => t.status === 'En cours').length,
      activeProspects: crm.filter(c =>
        ['Contacté', 'RDV pris', 'Offre envoyée'].includes(c.status)
      ).length,
      signedClients: crm.filter(c => c.status === 'Client').length,
      validatedIdeas: ideas.filter(i => i.status === 'Validée').length,
      totalTasks: tasks.length,
      totalCRM: crm.length,
      totalIdeas: ideas.length,
      tasksByStatus: {
        Backlog: tasks.filter(t => t.status === 'Backlog').length,
        'À faire': tasks.filter(t => t.status === 'À faire').length,
        'En cours': tasks.filter(t => t.status === 'En cours').length,
        Review: tasks.filter(t => t.status === 'Review').length,
        Done: tasks.filter(t => t.status === 'Done').length,
      },
      recentTasks: tasks.slice(0, 6),
      topIdeas: ideas.slice(0, 5),
    }

    return NextResponse.json(kpis)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 })
  }
}
