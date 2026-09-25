const FIXED_USER_ID = "gilson_master";

const ENERGIA_KEYS = [
  "referralCode",
  "user_referral_code",
  "sistemi_silencio_completado",
  "tutorial_completed",
];

export async function logout(): Promise<void> {
  const { queryClient } = await import("./queryClient");
  queryClient.clear();
  
  ENERGIA_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
  
  sessionStorage.clear();
  
  window.location.href = "/espejo/v2";
}

export function getUserId(): string {
  return FIXED_USER_ID;
}
