export const MARK_ACTIONS = ["contacted", "not_relevant", "restored"] as const;

export type MarkAction = (typeof MARK_ACTIONS)[number];

export type HidingMarkAction = Exclude<MarkAction, "restored">;

export const NOTE_MAX_LENGTH = 280;
