import { NextResponse } from 'next/server'
import { getTasks, getCRM, getIdeas } from '@/lib/db'

export async function GET() {
  try {
    const [tasks, crm, ideas] = await Promise.all([getTasks(), getCRM(), getIdeas()])

    const now = Date.now()
    const h24  = 24 * 60 * 60 * 1000
    const h48  = 48 * 60 * 60 * 1000
    const h168 = 7  * 24 * 60 * 60 * 1000

    const tasksLast24h = tasks.filter(t => now - new Date(t.createdAt).getTime() < h24).length
    const tasksPrev24h = tasks.filter(t => {
      const age = now - new Date(t.createdAt).getTime()
      return age >= h24 && age < h48
    }).length
    const tasksDelta = tasksPrev24h === 0
      ? (tasksLast24h > 0 ? 100 : 0)
      : Math.round(((tasksLast24h - tasksPrev24h) / tasksPrev24h) * 100)

    const completedLast24h = tasks.filter(
      t => t.status === 'Done' && now - new Date(t.lastEdited).getTime() < h24
    ).length

    const doneTasks = tasks.filter(t => t.status === 'Done').length
    const completionRate = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0

    const crmTotal = crm.filter(c => c.status !== 'Refus').length
    const crmConversionRate = crmTotal > 0
      ? Math.round((crm.filter(c => c.status === 'Client').length / crmTotal) * 100)
      : 0

    const doneLastWeek = tasks.filter(
      t => t.status === 'Done' && now - new Date(t.lastEdited).getTime() < h168
    ).length
    const taskVelocity = Math.round((doneLastWeek / 7) * 10) / 10

    const todayStr = new Date().toISOString().slice(0, 10)
    const urgentTasks = tasks
      .filter(t => t.status !== 'Done' && t.dateEnd && t.dateEnd <= todayStr)
      .sort((a, b) => (a.dateEnd > b.dateEnd ? 1 : -1))
      .slice(0, 10)
    const overdueCount = tasks.filter(t => t.status !== 'Done' && t.dateEnd && t.dateEnd < todayStr).length

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
        Backlog:    tasks.filter(t => t.status === 'Backlog').length,
        'À faire':  tasks.filter(t => t.status === 'À faire').length,
        'En cours': tasks.filter(t => t.status === 'En cours').length,
        Review:     tasks.filter(t => t.status === 'Review').length,
        Done:       doneTasks,
      },
      recentTasks: tasks.slice(0, 6),
      urgentTasks,
      overdueCount,
      topIdeas: ideas.slice(0, 5),
      tasksLast24h,
      tasksPrev24h,
      tasksDelta,
      completedLast24h,
      completionRate,
      crmConversionRate,
      taskVelocity,
    }

    return NextResponse.json(kpis)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 })
  }
}
