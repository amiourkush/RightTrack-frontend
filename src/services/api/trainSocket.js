export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'wss://railai-yqqj.onrender.com';

/**
 * TrainLiveTracker handles real-time streaming of train live status over WebSockets
 * per API_DOCS 2 Section 7 & 9.
 */
export class TrainLiveTracker {
  constructor(trainNumber, date, onUpdate, onError, onStateChange) {
    this.trainNumber = String(trainNumber);
    this.date = date || new Date().toISOString().split('T')[0];
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.onStateChange = onStateChange;
    this.ws = null;
    this.pingInterval = null;
    this.reconnectTimeout = null;
    this.reconnectDelay = 3000;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isDestroyed = false;
    this.connect();
  }

  connect() {
    if (this.isDestroyed || !this.trainNumber) return;

    try {
      const url = `${WS_BASE_URL}/trains/${encodeURIComponent(this.trainNumber)}/live?date=${encodeURIComponent(this.date)}`;
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        if (this.isDestroyed) {
          try { socket.close(1000, 'Destroyed'); } catch (_) {}
          return;
        }
        this.reconnectDelay = 3000;
        this.reconnectAttempts = 0;
        if (this.onStateChange) this.onStateChange({ isConnected: true });

        clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.send(JSON.stringify({ action: 'ping' }));
            } catch (e) {
              // ignore
            }
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'LIVE_STATUS_INITIAL' || msg.type === 'LIVE_STATUS_UPDATE') {
            if (this.onUpdate && msg.data) {
              this.onUpdate(msg.data, msg.type);
            }
          } else if (msg.type === 'ERROR') {
            if (this.onError) this.onError(msg.message);
          }
        } catch (err) {
          console.warn('[RailAI WS] Failed to parse message', err);
        }
      };

      socket.onclose = () => {
        clearInterval(this.pingInterval);
        if (this.onStateChange) this.onStateChange({ isConnected: false });
        if (!this.isDestroyed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
            this.connect();
          }, this.reconnectDelay);
        }
      };

      socket.onerror = (err) => {
        if (this.onError) this.onError(err);
      };
    } catch (error) {
      if (this.onError) this.onError(error);
    }
  }

  disconnect() {
    this.isDestroyed = true;
    clearInterval(this.pingInterval);
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      const socket = this.ws;
      this.ws = null;

      // Remove handlers so disconnect events don't trigger reconnection
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;

      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Client closed');
        } else if (socket.readyState === WebSocket.CONNECTING) {
          // If socket is still connecting, closing immediately triggers:
          // "WebSocket is closed before the connection is established."
          // Wait for open event and then close immediately.
          socket.onopen = () => {
            try {
              socket.close(1000, 'Client closed');
            } catch (_) {}
          };
        }
      } catch (e) {
        // ignore
      }
    }
    if (this.onStateChange) this.onStateChange({ isConnected: false });
  }
}
