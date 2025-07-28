const BACKEND_URL = "https://spr5tkpvok.execute-api.us-east-2.amazonaws.com/dev/stedi-eligibility";

export async function checkEligibility(data) {
  // Don't transform the date - Lambda A expects YYYYMMDD and will handle the conversion to YYYY-MM-DD for Nirvana
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  let json;
  try {
    json = await response.json();
  } catch {
    throw new Error("Received invalid JSON from server");
  }

  if (!response.ok) {
    throw new Error(json.error || json.message || "Eligibility check failed");
  }

  return json;
}