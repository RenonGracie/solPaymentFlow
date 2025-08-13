"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MatchedTherapist from "@/components/MatchedTherapist";
import { fetchMatches, createAppointment } from "@/api/solhealth";
import type { TMatchedTherapistData } from "@/api/types/therapist.types";

type ClientInfo = {
  id?: string;
  response_id?: string;
  email?: string;
  state?: string; // optional; BE can derive TZ from this if needed
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://solhealthbe-production.up.railway.app";

export default function MatchPage() {
  const [therapists, setTherapists] = useState<TMatchedTherapistData[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const responseId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("response_id") || ""
      : "";

  useEffect(() => {
    if (!responseId) return;
    setLoading(true);
    fetchMatches(responseId)
      .then(({ client, therapists }) => {
        setClient(client);
        setTherapists(therapists || []);
      })
      .catch((e: unknown) =>
        setError((e as Error)?.message || "Failed to load matches"),
      )
      .finally(() => setLoading(false));
  }, [responseId]);

  const onBookSession = async (
    match: TMatchedTherapistData,
    datetimeLocal: string,
  ) => {
    try {
      // normalize local date string -> ISO (UTC)
      const [dPart, tPart] = datetimeLocal.split("T");
      const [y, m, d] = dPart.split("-").map(Number);
      const [hh, mm, ss] = (tPart || "00:00:00").split(":").map(Number);
      const local = new Date(
        y,
        (m || 1) - 1,
        d || 1,
        hh || 0,
        mm || 0,
        ss || 0,
      );
      const iso = local.toISOString();

      const clientResponseId: string | undefined =
        client?.response_id || client?.id;
      const therapistEmail: string | undefined =
        match.therapist.calendar_email || match.therapist.email;
      const therapistName: string | undefined =
        match.therapist.intern_name ||
        (match as unknown as { therapist?: { name?: string } })?.therapist
          ?.name;

      if (!clientResponseId || !therapistEmail || !therapistName) {
        alert("Missing booking details. Please try again later.");
        return;
      }

      // (optional) mark the chosen therapist before creating the appointment
      try {
        await fetch(`${API_BASE}/therapists/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            response_id: clientResponseId,
            therapist_email: therapistEmail,
          }),
        });
      } catch {
        // non-fatal; continue
      }

      // 1) create the appointment on BE (returns the object you pasted)
      const appointmentPayload = await createAppointment({
        clientResponseId,
        therapistEmail,
        therapistName,
        datetimeIso: iso,
        // You can also add state/timezone here if your BE accepts it:
        // state: client?.state,
        // timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      // 2) immediately sync the appointment to client_responses
      //    (BE should update match_status, therapist fields, slot start/end, intakeq_client_id, etc.)
      await fetch(`${API_BASE}/appointments/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send exactly what create returned (it already includes ClientResponseId).
        // Optionally include client.state if your BE uses it to resolve timezone.
        body: JSON.stringify({
          ...appointmentPayload,
          State: client?.state,
        }),
      });

      // 3) go to confirmation
      router.push(`/booking/confirmed?response_id=${encodeURIComponent(clientResponseId)}`);
    } catch (e) {
      console.error(e);
      alert("We couldn’t complete your booking. Please try again.");
    }
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
