
const state = reactive<RealtimeState>({
  connected: false,
  activeSessions: 0,
  onlineWorkers: 0,
  queueSize: 0,
  campaignStats: {},
  workerStats: [],
  proxyHealth: [],
})

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 1000

// ── Store composable ─────────────────────────────────────────
export function useRealtimeStore() {
  return {
    wsConnected: computed(() => state.connected),
    activeSessions: computed(() => state.activeSessions),
    onlineWorkers: computed(() => state.onlineWorkers),
    queueSize: computed(() => state.queueSize),
    campaignStats: computed(() => state.campaignStats),
    workerStats: computed(() => state.workerStats),
    proxyHealth: computed(() => state.proxyHealth),
  }
}

// ── Main composable ──────────────────────────────────────────
export function useRealtime() {
  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${proto}//${location.host}/_ws`)

    ws.onopen = () => {
      state.connected = true
      reconnectDelay = 1000
      // Subscribe to channels
      ws!.send(JSON.stringify({
        type: 'subscribe',
        channels: ['analytics:update', 'campaign:update', 'worker:update', 'queue:update'],
      }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      state.connected = false
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function handleMessage(msg: { type: string; data: any }) {
    switch (msg.type) {
      case 'analytics:update':
        state.activeSessions = msg.data.activeSessions ?? state.activeSessions
        state.queueSize = msg.data.queueSize ?? state.queueSize
        Object.assign(state.campaignStats, msg.data.campaigns ?? {})
        break

      case 'worker:update':
        state.onlineWorkers = msg.data.onlineWorkers ?? state.onlineWorkers
        if (msg.data.workers) state.workerStats = msg.data.workers
        break

      case 'queue:update':
        state.queueSize = msg.data.size ?? state.queueSize
        break

      case 'proxy:update':
        if (msg.data.proxies) state.proxyHealth = msg.data.proxies
        break

      case 'ping':
        ws?.send(JSON.stringify({ type: 'pong' }))
        break
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
      connect()
    }, reconnectDelay)
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
    ws = null
  }

  // Auto connect on mount, disconnect on unmount
  onMounted(connect)
  onUnmounted(disconnect)

  return {
    ...useRealtimeStore(),
    connect,
    disconnect,
  }
}
