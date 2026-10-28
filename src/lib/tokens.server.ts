// Server helpers for self-hosted Jarvis: unlimited balance for owner.
export const STARTING_BALANCE = 999999;
export const CHAT_COST = 0;

export async function getOrCreateBalance(_userId: string): Promise<number> {
  return 999999;
}

export async function tryConsume(_userId: string, _cost: number): Promise<number | null> {
  return 999999;
}
