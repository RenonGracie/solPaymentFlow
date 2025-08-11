"use client";

import { useEffect, useState } from "react";
import MatchedTherapist from "@/components/MatchedTherapist";
import { fetchMatches, createAppointment } from "@/api/solhealth";
import type { TMatchedTherapistData } from "@/api/types/therapist.types";

type ClientInfo = {
  id?: string;
  response_id?: string;
  email?: string;
  state?: string;
};

export default function MatchPage() {
  const [therapists, setTherapists] = useState<TMatchedTherapistData[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const responseId = typeof window !== "undefined"
    ? (new URLSearchParams(window.location.search).get("response_id") || "")
    : "";

  useEffect(() => {
    if (!responseId) return;
    setLoading(true);
    fetchMatches(responseId)
      .then(({ client, therapists }) => {
        setClient(client);
        setTherapists(therapists || []);
      })
      .catch((e: unknown) => setError((e as Error)?.message || "Failed to load matches"))
      .finally(() => setLoading(false));
  }, [responseId]);

  const onBookSession = async (
    match: TMatchedTherapistData,
    datetimeLocal: string,
  ) => {
    const [dPart, tPart] = datetimeLocal.split("T");
    const [y, m, d] = dPart.split("-").map(Number);
    const [hh, mm, ss] = (tPart || "00:00:00").split(":").map(Number);
    const local = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
    const iso = local.toISOString();

    const clientResponseId: string | undefined = client?.response_id || client?.id;
    const therapistEmail: string | undefined = match.therapist.calendar_email || match.therapist.email;
    const therapistName: string | undefined = match.therapist.intern_name || (match as unknown as { therapist?: { name?: string } })?.therapist?.name;

    if (!clientResponseId || !therapistEmail || !therapistName) {
      alert("Missing booking details. Please try again later.");
      return;
    }

    await createAppointment({
      clientResponseId,
      therapistEmail,
      therapistName,
      datetimeIso: iso,
    });

    alert(
      "Your session has been requested. You’ll receive a confirmation email.",
    );
  };

  if (!responseId) return <div>Missing response_id</div>;
  if (loading) return <div>Loading matches…</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <MatchedTherapist
      therapistsList={therapists}
      clientData={client || undefined}
      onBookSession={onBookSession}
    />
  );
} 