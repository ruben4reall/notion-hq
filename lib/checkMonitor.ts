export async function checkMonitor(monitor: { id: string; url: string; type: string; keyword?: string }) {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(monitor.url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'Manager-Monitor/1.0', 'Cache-Control': 'no-cache' },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    const response_ms = Date.now() - start

    let status: 'up' | 'down' | 'degraded' = res.ok ? 'up' : 'down'
    if (res.ok && response_ms > 3000) status = 'degraded'

    if (monitor.type === 'keyword' && monitor.keyword && res.ok) {
      const text = await res.text()
      if (!text.includes(monitor.keyword)) status = 'down'
    }

    return { monitor_id: monitor.id, status, response_ms, status_code: res.status }
  } catch (err: any) {
    const response_ms = Date.now() - start
    const error = err?.name === 'AbortError' ? 'Timeout (10s)' : (err?.message || 'Unknown error')
    return { monitor_id: monitor.id, status: 'down' as const, response_ms, error }
  }
}
