export type AuthStatus = {
  required: boolean;
  authenticated: boolean;
};

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const res = await fetch("/api/auth");
    if (!res.ok) return { required: false, authenticated: true };
    return (await res.json()) as AuthStatus;
  } catch {
    return { required: false, authenticated: true };
  }
}

export async function loginWithPin(pin: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      localStorage.setItem("jarvis_unlocked", "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth", { method: "DELETE" });
  } catch {
    // ignore
  }
  localStorage.removeItem("jarvis_unlocked");
  window.location.href = "/auth";
}
