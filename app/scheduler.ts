import { Card } from "./cards";

type QueueItem = { card: Card; shownAt: number };

function scheduleNext(
  correct: boolean,
  engagement: number | null,
  responseTimeMs: number,
  queue: Card[],
  card: Card
): Card[] {
  const remaining = queue.filter((c) => c.id !== card.id);
  const isLowEngagement = engagement !== null && engagement < 0.4;
  const isFastResponse = responseTimeMs < 3000;

  let requeueOffset: number;

  if (!correct) {
    requeueOffset = 2; // wrong -> back soon
  } else if (isLowEngagement && isFastResponse) {
    requeueOffset = Infinity; // likely mastery -> drop from this session's queue
  } else if (isLowEngagement && !isFastResponse) {
    requeueOffset = 2; // likely lapse -> back soon, same as wrong
  } else {
    requeueOffset = 5; // normal spacing
  }

  if (requeueOffset === Infinity) return remaining;

  const insertAt = Math.min(requeueOffset, remaining.length);
  return [...remaining.slice(0, insertAt), card, ...remaining.slice(insertAt)];
}