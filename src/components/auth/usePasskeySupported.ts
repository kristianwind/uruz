"use client";

import { useEffect, useState } from "react";
import { passkeySupported } from "@/lib/auth/passkey-client";

/**
 * Whether this browser can do passkeys, answered only once mounted.
 *
 * `passkeySupported()` inspects `window`, so on the server it is always false
 * and in the browser usually true — reading it during render made the first
 * paint disagree with the server and React threw the whole tree away and
 * rebuilt it. Starting at false and settling after mount means the server and
 * the first client render say the same thing, which is the only thing React
 * insists on.
 */
export function usePasskeySupported(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(passkeySupported()), []);
  return supported;
}
