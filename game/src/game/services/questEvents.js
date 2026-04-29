const SSE_URL = '/api/v1/events';

let _lastQuestStartPayload = null;
let _lastQuestCompletePayload = null;

export function getLastQuestStartPayload() {
  return _lastQuestStartPayload;
}

export function getLastQuestCompletePayload() {
  return _lastQuestCompletePayload;
}

export class QuestEventStream {
  constructor() {
    this.startHandlers = new Set();
    this.completeHandlers = new Set();
    this.eventSource = null;
    this.connect();
  }

  connect() {
    if (typeof window === 'undefined' || typeof window.EventSource !== 'function') {
      console.warn('[questEvents] EventSource not available; quest toasts disabled.');
      return;
    }
    try {
      this.eventSource = new EventSource(SSE_URL);
    } catch (err) {
      console.warn('[questEvents] failed to open EventSource:', err);
      return;
    }
    this.eventSource.addEventListener('quest_start', (event) => {
      this.dispatch(this.startHandlers, event, (payload) => {
        _lastQuestStartPayload = payload;
      });
    });
    this.eventSource.addEventListener('quest_complete', (event) => {
      this.dispatch(this.completeHandlers, event, (payload) => {
        _lastQuestCompletePayload = payload;
      });
    });
    this.eventSource.addEventListener('open', () => {
      console.log('[questEvents] connected');
    });
    this.eventSource.addEventListener('error', () => {
      // EventSource auto-reconnects with default 3s delay.
      console.warn('[questEvents] connection lost; awaiting reconnect');
    });
  }

  dispatch(handlers, messageEvent, onParsed) {
    let payload = null;
    try {
      payload = JSON.parse(messageEvent.data);
    } catch (err) {
      console.warn('[questEvents] failed to parse event data:', err);
      return;
    }
    if (onParsed) onParsed(payload);
    if (!handlers.size) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error('[questEvents] handler threw:', err);
      }
    }
  }

  onQuestStart(handler) {
    this.startHandlers.add(handler);
    return () => this.startHandlers.delete(handler);
  }

  onQuestComplete(handler) {
    this.completeHandlers.add(handler);
    return () => this.completeHandlers.delete(handler);
  }

  dispose() {
    this.startHandlers.clear();
    this.completeHandlers.clear();
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {
        // ignore
      }
      this.eventSource = null;
    }
  }
}
