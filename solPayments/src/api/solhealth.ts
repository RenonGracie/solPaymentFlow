// src/api/solhealth.ts
import type { TMatchedTherapistData } from "@/api/types/therapist.types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export type MatchResponse = {
  client: {
    id?: string;
    response_id?: string;
    email?: string;
    state?: string;
  } | null;
  therapists: TMatchedTherapistData[];
};

export async function fetchMatches(responseId: string, limit = 50, excludeTherapistIds?: string[]) {
  const url = new URL(`${API_BASE}/therapists/match`);
  url.searchParams.set('response_id', responseId);
  url.searchParams.set('limit', String(limit));
  
  // Add excluded therapist IDs if provided
  if (excludeTherapistIds && excludeTherapistIds.length > 0) {
    excludeTherapistIds.forEach(id => {
      url.searchParams.append('exclude_therapist_id', id);
    });
  }
  
  const res = await fetch(url.toString(), { 
    cache: "no-store",
    signal: AbortSignal.timeout(30000) // 30 second timeout for therapist matching
  });
  const data: MatchResponse = await res.json();
  if (!res.ok) {
    throw new Error((data as unknown as string) || "Failed to fetch matches");
  }
  return data;
}

export async function createAppointment(params: {
  clientResponseId: string;
  therapistEmail: string;
  therapistName: string;
  datetimeIso: string; // ISO 8601
  sendClientEmailNotification?: boolean;
  reminderType?: "email" | "sms";
  status?: string;
}) {
  const body = {
    client_response_id: params.clientResponseId,
    therapist_email: params.therapistEmail,
    therapist_name: params.therapistName,
    datetime: params.datetimeIso,
    send_client_email_notification:
      params.sendClientEmailNotification ?? true,
    reminder_type: params.reminderType ?? "email",
    status: params.status ?? "scheduled",
  };

  const res = await fetch(`${API_BASE}/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to book appointment");
  }
  return data;
} 