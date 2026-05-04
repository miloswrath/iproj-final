const SSE_URL = '/api/v1/events';

let _lastQuestStartPayload = null;
let _lastQuestCompletePayload = null;
let _lastFriendUnlockPayload = null;
let _lastFriendSummaryPayload = null;

export function getLastQuestStartPayload() {
  return _lastQuestStartPayload;
}

export function getLastQuestCompletePayload() {
  return _lastQuestCompletePayload;
}

export function getLastFriendUnlockPayload() {
  return _lastFriendUnlockPayload;
}

export function getLastFriendSummaryPayload() {
  return _lastFriendSummaryPayload;
}

export class QuestEventStream {
  constructor() {
    this.startHandlers = new Set();
    this.completeHandlers = new Set();
    this.friendUnlockHandlers = new Set();
    this.friendSummaryHandlers = new Set();
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

  emitFriendUnlock(payload) {
    _lastFriendUnlockPayload = payload;
    for (const handler of this.friendUnlockHandlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error('[questEvents] friend unlock handler threw:', err);
      }
    }
  }

  emitFriendSummaryUpdated(payload) {
    _lastFriendSummaryPayload = payload;
    for (const handler of this.friendSummaryHandlers) {
      try {
        handler(payload);
      } catch (err) {
        console.error('[questEvents] friend summary handler threw:', err);
      }
    }
  }

  onFriendUnlock(handler) {
    this.friendUnlockHandlers.add(handler);
    return () => this.friendUnlockHandlers.delete(handler);
  }

  onFriendSummaryUpdated(handler) {
    this.friendSummaryHandlers.add(handler);
    return () => this.friendSummaryHandlers.delete(handler);
  }

  dispose() {
    this.startHandlers.clear();
    this.completeHandlers.clear();
    this.friendUnlockHandlers.clear();
    this.friendSummaryHandlers.clear();
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
