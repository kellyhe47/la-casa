export type Screen = "title" | "living-room" | "fridge" | "bedroom" | "off-ramp";
export type MicState = "idle" | "requesting" | "granted" | "denied" | "listening" | "thinking";

export const SCREEN_ORDER: Screen[] = ["title", "living-room", "fridge", "bedroom", "off-ramp"];
