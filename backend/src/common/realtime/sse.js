const clients = new Set();

const KEEPALIVE_MS = 20000;

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const writeEvent = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const subscribeAdminStream = (req, res) => {
  const sessionId = toNumberOrNull(req.query.sessionId);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const client = {
    res,
    sessionId,
    keepAlive: setInterval(() => {
      writeEvent(res, "heartbeat", {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
      });
    }, KEEPALIVE_MS),
  };

  clients.add(client);

  writeEvent(res, "connected", {
    type: "connected",
    sessionId,
    timestamp: new Date().toISOString(),
  });

  req.on("close", () => {
    clearInterval(client.keepAlive);
    clients.delete(client);
    res.end();
  });
};

export const publishAdminEvent = (event) => {
  const payload = {
    type: event.type ?? "refresh",
    sessionId: toNumberOrNull(event.sessionId),
    scope: event.scope ?? "all",
    timestamp: event.timestamp ?? new Date().toISOString(),
    reason: event.reason ?? null,
  };

  for (const client of clients) {
    if (client.sessionId && payload.sessionId && client.sessionId !== payload.sessionId) {
      continue;
    }

    if (client.sessionId && !payload.sessionId && payload.scope === "session") {
      continue;
    }

    writeEvent(client.res, "update", payload);
  }
};
