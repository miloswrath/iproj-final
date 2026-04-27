const API_BASE = '/api/v1/conversation';

export class AiClientError extends Error {
  constructor(code, httpStatus, message) {
    super(message ?? code);
    this.name = 'AiClientError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  } catch (err) {
    throw new AiClientError('network_error', 0, err?.message ?? 'fetch failed');
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const code =
      (payload && typeof payload.code === 'string' && payload.code) ||
      (payload && typeof payload.error === 'string' && payload.error) ||
      `http_${response.status}`;
    const message =
      (payload && typeof payload.message === 'string' && payload.message) ||
      `Request failed with status ${response.status}`;
    throw new AiClientError(code, response.status, message);
  }

  return payload ?? {};
}

export async function startConversation(character) {
  if (typeof character !== 'string' || !character.trim()) {
    throw new AiClientError('invalid_argument', 0, 'character must be a non-empty string');
  }
  return postJson(`${API_BASE}/start`, { character });
}

export async function sendMessage(sessionId, text) {
  if (typeof sessionId !== 'string' || !sessionId) {
    throw new AiClientError('invalid_argument', 0, 'sessionId required');
  }
  if (typeof text !== 'string' || !text.trim()) {
    throw new AiClientError('invalid_argument', 0, 'text must be non-empty');
  }
  return postJson(`${API_BASE}/${encodeURIComponent(sessionId)}/message`, { text });
}

export async function endConversation(sessionId, reason = 'exit') {
  if (typeof sessionId !== 'string' || !sessionId) {
    throw new AiClientError('invalid_argument', 0, 'sessionId required');
  }
  return postJson(`${API_BASE}/${encodeURIComponent(sessionId)}/end`, { reason });
}
