"use client";

import { UserRole } from "@campushire/types";
import { env } from "@/lib/env";

interface OAuthButtonsProps {
  mode: "login" | "register";
  role?: UserRole;
  inviteCode?: string;
}

const API_URL = env.apiUrl;

const googleIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.35 11.1H12v2.98h5.36c-.23 1.48-1.86 4.35-5.36 4.35-3.22 0-5.85-2.67-5.85-5.96S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.56-2.48C16.7 3.95 14.55 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.59-.07-1.04-.15-1.1Z"
    />
  </svg>
);

const linkedInIcon = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="currentColor"
      d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95v5.67H9.34V9h3.41v1.56h.05c.47-.9 1.64-1.86 3.39-1.86 3.63 0 4.3 2.39 4.3 5.5v6.25ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.56V9h3.56v11.45Z"
    />
  </svg>
);

const buildState = (role?: UserRole, inviteCode?: string): string => {
  const payload = {
    role: role ?? UserRole.JOB_SEEKER,
    inviteCode: inviteCode?.trim() ? inviteCode.trim() : undefined
  };

  if (typeof window === "undefined") {
    return "";
  }

  return window.btoa(JSON.stringify(payload));
};

export const OAuthButtons = ({ mode, role, inviteCode }: OAuthButtonsProps) => {
  const handleGoogle = () => {
    const state = mode === "register" ? buildState(role, inviteCode) : buildState(role);
    window.location.href = `${API_URL}/api/auth/google?state=${encodeURIComponent(state)}`;
  };

  const handleLinkedIn = () => {
    const state = mode === "register" ? buildState(role, inviteCode) : buildState(role);
    window.location.href = `${API_URL}/api/auth/linkedin?state=${encodeURIComponent(state)}`;
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >
        {googleIcon}
        Continue with Google
      </button>
      <button
        type="button"
        onClick={handleLinkedIn}
        className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#0A66C2] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0958A8]"
      >
        {linkedInIcon}
        Continue with LinkedIn
      </button>
    </div>
  );
};
