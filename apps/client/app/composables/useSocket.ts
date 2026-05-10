type MessageHandler = (payload: Record<string, any>) => void;

/**
 * Composable untuk koneksi realtime via Nitro native WebSocket.
 * Endpoint: /ws
 *
 * Penggunaan:
 *   const { status, connect, join, send, on } = useSocket()
 *   connect()
 *   join(userId)
 *   const off = on('chunk', (payload) => appendToken(payload.content))
 *   onBeforeUnmount(() => off())
 */
export const useSocket = () => {
  const handlers = new Map<string, MessageHandler[]>();

  const getWsUrl = () => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}/ws`;
  };

  const {
    status,
    send: rawSend,
    open,
    close,
  } = useWebSocket(getWsUrl, {
    immediate: false,
    autoReconnect: {
      retries: 5,
      delay: 1500,
      onFailed() {
        console.error("[WS] Reconnect gagal setelah 5 percobaan");
      },
    },
    onMessage(_ws, event) {
      try {
        const payload = JSON.parse(event.data as string) as Record<string, any>;
        handlers.get(payload.type)?.forEach((h) => h(payload));
      } catch {
        console.error("[WS] Parse error:", event.data);
      }
    },
    onConnected() {
      console.log("[WS] Connected");
    },
    onDisconnected() {
      console.log("[WS] Disconnected");
    },
    onError(_ws, event) {
      console.error("[WS] Error:", event);
    },
  });

  /** Daftarkan handler untuk tipe pesan tertentu. Return fungsi untuk unregister. */
  function on(type: string, handler: MessageHandler): () => void {
    if (!handlers.has(type)) handlers.set(type, []);
    handlers.get(type)!.push(handler);
    return () => {
      const list = handlers.get(type);
      if (!list) return;
      const idx = list.indexOf(handler);
      if (idx > -1) list.splice(idx, 1);
    };
  }

  function send(payload: object) {
    rawSend(JSON.stringify(payload));
  }

  /** Bergabung ke room user setelah connect */
  function join(userId: string) {
    send({ type: "join", userId });
  }

  return { status, connect: open, disconnect: close, send, join, on };
};
