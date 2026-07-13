// The Coach Agreement is a click-wrap contract: coaches tick a box at signup
// (or once on their dashboard, for accounts created before it existed) and we
// store the timestamp + version on their CoachProfile as proof of acceptance.
// Bump the version when the agreement text changes materially — coaches on an
// older version will be asked to re-accept on their dashboard.
export const COACH_AGREEMENT_VERSION = "1.0";
