import { NextRequest, NextResponse } from 'next/server'
import { getUser, getOrgId } from '@/lib/auth'
import { getTasks, getCRM, getIdeas } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const orgId = getOrgId(req)
  if (!orgId) return NextResponse.json({ error: 'No project' }, { status: 400 })
  try {
    const [tasks, crm, ideas] = await Promise.all([getTasks(orgId), getCRM(orgId), getIdeas(orgId)])

    const now = Date.now()
    const h24 = 86_400_000
    const h48 = 172_800_000
    const h168 = 604_800_000
    const todayStr = new Date().toISOString().slice(0, 10)

    // Single pass over tasks
    let tasksInProgress = 0, doneTasks = 0, tasksLast24h = 0, tasksPrev24h = 0
    let completedLast24h = 0, taskVelocityDone = 0, overdueCount = 0
    const tasksByStatus: Record<string, number> = {}
    const urgentTasks: typeof tasks = []

    for (const t of tasks) {
      const status = t.status
      tasksByStatus[status] = (tasksByStatus[status] || 0) + 1
      if (status === 'En cours') tasksInProgress++
      if (status === 'Done') {
        doneTasks++
        const editAge = now - new Date(t.lastEdited).getTime()
        if (editAge < h24) completedLast24h++
        if (editAge < h168) taskVelocityDone++
      }
      const createAge = now - new Date(t.createdAt).getTime()
      if (createAge < h24) tasksLast24h++
      else if (createAge < h48) tasksPrev24h++
      if (status !== 'Done' && t.dateEnd) {
        if (t.dateEnd < todayStr) overdueCount++
        if (t.dateEnd <= todayStr) urgentTasks.push(t)
      }
    }

    urgentTasks.sort((a, b) => a.dateEnd > b.dateEnd ? 1 : -1)

    // Single pass over crm
    let activeProspects = 0, signedClients = 0, nonRefus = 0
    for (const c of crm) {
      if (['Contacté', 'RDV pris', 'Offre envoyée'].includes(c.status)) activeProspects++
      if (c.status === 'Client') signedClients++
      if (c.status !== 'Refus') nonRefus++
    }

    const tasksDelta = tasksPrev24h === 0
      ? (tasksLast24h > 0 ? 100 : 0)
      : Math.round(((tasksLast24h - tasksPrev24h) / tasksPrev24h) * 100)

    return NextResponse.json({
      tasksInProgress,
      activeProspects,
      signedClients,
      validatedIdeas: ideas.filter(i => i.status === 'Validée').length,
      totalTasks: tasks.length,
      totalCRM: crm.length,
      totalIdeas: ideas.length,
      tasksByStatus: {
        Backlog: tasksByStatus['Backlog'] || 0,
        'À faire': tasksByStatus['À faire'] || 0,
        'En cours': tasksByStatus['En cours'] || 0,
        Review: tasksByStatus['Review'] || 0,
        Done: doneTasks,
      },
      recentTasks: tasks.slice(0, 6),
      urgentTasks: urgentTasks.slice(0, 10),
      overdueCount,
      topIdeas: ideas.slice(0, 5),
      tasksLast24h,
      tasksPrev24h,
      tasksDelta,
      completedLast24h,
      completionRate: tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0,
      crmConversionRate: nonRefus > 0 ? Math.round((signedClients / nonRefus) * 100) : 0,
      taskVelocity: Math.round((taskVelocityDone / 7) * 10) / 10,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
