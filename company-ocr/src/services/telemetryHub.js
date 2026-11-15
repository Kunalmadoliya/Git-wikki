const subscribers = new Map();

export function publishUpdate(sourceId, updatePayload) {
  const sourceSubscribers = subscribers.get(sourceId);
  if (!sourceSubscribers) return;

  const event = `event: source.updated\ndata: ${JSON.stringify(updatePayload)}\n\n`;
  const isTerminal = ["READY", "FAILED", "CANCELLED"].includes(
    updatePayload.stage,
  );
  for (const subscription of sourceSubscribers) {
    subscription.response.write(event);
    if (isTerminal) {
      clearInterval(subscription.heartbeat);
      subscription.response.end();
      sourceSubscribers.delete(subscription);
    }
  }
  if (sourceSubscribers.size === 0) subscribers.delete(sourceId);
}

export function subscribe(sourceId, response) {
  let sourceSubscribers = subscribers.get(sourceId);
  if (!sourceSubscribers) {
    sourceSubscribers = new Set();
    subscribers.set(sourceId, sourceSubscribers);
  }
  const subscription = {
    response,
    heartbeat: setInterval(() => {
      response.write(": keep-alive\n\n");
    }, 15_000),
  };
  sourceSubscribers.add(subscription);

  return () => {
    clearInterval(subscription.heartbeat);
    sourceSubscribers.delete(subscription);
    if (sourceSubscribers.size === 0) {
      subscribers.delete(sourceId);
    }
  };
}
