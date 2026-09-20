
export type ReviewResult = "knew" | "guessed" | "failed";

export type CognitiveState =
  | "peak"
  | "normal"
  | "elevated-load";

export type CardDifficulty = "easy" | "medium" | "hard";

export type CardSchedule = {
  cardId: number;
  result?: ReviewResult;
  engagement?: number;
  theta?: number;
  alpha?: number;
  beta?: number;
  signalQuality?: number;
  thetaBetaRatio?: number;
  cognitiveState?: CognitiveState;
  intervalSeconds: number;
  nextReview: number;
  reviewCount: number;
};

type ScheduleInput = {
  result: ReviewResult;
  engagement: number;
  theta: number;
  alpha: number;
  beta: number;
  signalQuality: number;
  previousInterval: number;
};

/**
 * Demo thresholds.
 *
 * These are NOT universal scientific cutoffs.
 * For a real system, calibrate against the user's baseline.
 */
export function getThetaBetaRatio(
  theta: number,
  beta: number
): number {
  return theta / Math.max(beta, 0.01);
}

export function getCognitiveState(
  theta: number,
  beta: number,
  signalQuality: number
): CognitiveState {
  // Don't make scheduler decisions from poor-quality EEG.
  if (signalQuality < 0.6) {
    return "normal";
  }

  const ratio = getThetaBetaRatio(theta, beta);

  if (ratio < 0.8) {
    return "peak";
  }

  if (ratio < 1.3) {
    return "normal";
  }

  return "elevated-load";
}

export function calculateNextInterval({
  result,
  engagement,
  theta,
  beta,
  signalQuality,
  previousInterval,
}: ScheduleInput): number {
  let baseInterval: number;

  switch (result) {
    case "knew":
      baseInterval = 60;
      break;

    case "guessed":
      baseInterval = 30;
      break;

    case "failed":
      baseInterval = 15;
      break;
  }

  const cognitiveState = getCognitiveState(
    theta,
    beta,
    signalQuality
  );

  let multiplier = 1;

  /*
   * Behavioral result remains the primary signal.
   * EEG-derived state modifies the interval.
   */

  if (result === "knew") {
    multiplier = engagement >= 0.6 ? 1.5 : 1.2;
  }

  if (result === "guessed") {
    multiplier = engagement >= 0.6 ? 1.1 : 0.8;
  }

  if (result === "failed") {
    multiplier = engagement >= 0.6 ? 1.0 : 0.75;
  }

  // EEG-derived cognitive-state modifier.
  if (cognitiveState === "peak") {
    multiplier *= 1.15;
  }

  if (cognitiveState === "elevated-load") {
    multiplier *= 0.8;
  }

  // Don't let poor EEG quality strongly influence scheduling.
  if (signalQuality < 0.6) {
    multiplier = result === "knew"
      ? engagement >= 0.6
        ? 1.5
        : 1.2
      : result === "guessed"
      ? engagement >= 0.6
        ? 1.1
        : 0.8
      : engagement >= 0.6
      ? 1.0
      : 0.75;
  }

  const calculatedInterval = Math.round(
    baseInterval * multiplier
  );

  /*
   * Demo-mode bounds.
   *
   * Keeps reviews short enough for judges to observe
   * cards resurfacing during the demo.
   */
  const minInterval = 10;
  const maxInterval = 120;

  let nextInterval = Math.min(
    Math.max(calculatedInterval, minInterval),
    maxInterval
  );

  /*
   * Prevent an interval from exploding too quickly.
   */
  if (previousInterval > 0) {
    nextInterval = Math.min(
      nextInterval,
      previousInterval * 2
    );
  }

  return Math.max(nextInterval, minInterval);
}

export function getReasonForReview(
  result: ReviewResult | undefined,
  engagement: number | undefined,
  cognitiveState?: CognitiveState,
  thetaBetaRatio?: number
): string {
  if (!result) {
    return "This card has not been reviewed yet.";
  }

  const engagementLabel =
    engagement !== undefined
      ? engagement >= 0.6
        ? "higher"
        : "lower"
      : "unknown";

  const stateLabel =
    cognitiveState === "peak"
      ? "a stable EEG-derived state"
      : cognitiveState === "elevated-load"
      ? "an elevated EEG-derived load state"
      : "a normal EEG-derived state";

  if (result === "knew") {
    return `You knew this card with ${engagementLabel} EEG-derived engagement during ${stateLabel}, so it was spaced further out.`;
  }

  if (result === "guessed") {
    return `You got this card right but marked it as a guess. BrainFlip scheduled an earlier review, with the EEG-derived state also influencing the interval.`;
  }

  return `This card was marked failed, so BrainFlip brought it back sooner. The current EEG-derived state can also temporarily influence how the queue is prioritized.`;
}

export function getDifficulty(
  question: {
    id: number;
  },
  schedule: CardSchedule
): CardDifficulty {
  if (schedule.result === "failed") {
    return "hard";
  }

  if (schedule.result === "guessed") {
    return "medium";
  }

  /*
   * For demo purposes, cards that haven't been reviewed
   * are treated as medium difficulty.
   */
  if (!schedule.result) {
    return "medium";
  }

  return "easy";
}

