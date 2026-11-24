// Steam identifies a player in two ways:
//   - SteamID64: a 17-digit number like 76561198012345678 (what Steam profile
//     URLs and most tools show).
//   - Account ID: the smaller 32-bit number (what the Deadlock API uses).
// They differ by a fixed offset, so we can convert between them.

import { AdapterError } from "./errors";

const STEAM_ID64_OFFSET = BigInt("76561197960265728");

// Accepts either kind of ID (as text) and returns the 32-bit account ID.
export function toAccountId(input: string): number {
  const text = input.trim();

  // Allow pasting a full profile URL like steamcommunity.com/profiles/7656...
  const fromUrl = text.match(/steamcommunity\.com\/profiles\/(\d+)/);
  const digits = fromUrl ? fromUrl[1] : text;

  if (!/^\d+$/.test(digits)) {
    throw new AdapterError(
      "invalid_id",
      "Enter a numeric Steam ID (17 digits) or Deadlock account ID. Custom profile names aren't supported.",
    );
  }

  // 17-digit numbers are SteamID64s; subtract the offset to get the account ID.
  const big = BigInt(digits);
  const accountId = big >= STEAM_ID64_OFFSET ? big - STEAM_ID64_OFFSET : big;

  // The API stores account IDs as 32-bit signed integers.
  if (accountId <= BigInt(0) || accountId > BigInt(2147483647)) {
    throw new AdapterError("invalid_id", "That Steam ID is out of range.");
  }
  return Number(accountId);
}
