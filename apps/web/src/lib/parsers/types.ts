export type MessageSegment =
  | { type: 'text'; content: string }
  | { type: 'caveat'; content: string }
  | { type: 'command'; name: string; args: string };
