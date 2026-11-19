export type ProgressionSource = "local" | "cache" | "confirmed";

export function createAccessVerification() {
  let version = 0;
  let active = true;

  return {
    observe(source: ProgressionSource, allowed: boolean) {
      if (!allowed && source !== "confirmed") {
        return { shouldVerify: false, isCurrent: () => false };
      }
      const current = ++version;
      return {
        shouldVerify: true,
        isCurrent: () => active && version === current,
      };
    },
    dispose() {
      active = false;
      version++;
    },
  };
}
