// solPayments/src/api/eligibilityConfig.ts

export const PAYER_ID_BY_PROVIDER: Record<string, string> = {
	Aetna: "60054",
	"Meritain Health": "64157",
	"Horizon Blue Cross Blue Shield of NJ": "22099",
	AmeriHealth: "60061",
};

// Default NPI for all eligibility requests (overridable via env)
export const NPI: string = process.env.NEXT_PUBLIC_NPI || "1356936132";

// Override session cost estimates (allowed amount proxy) by payer ID
export const SESSION_COST_BY_PAYER_ID: Record<string, number> = {
	"60061": 102.19, // AmeriHealth
	"22099": 137.26, // Horizon BCBS of NJ
	"64157": 127.86, // Meritain Health
	"60054": 127.86, // Aetna
};

export function getSessionCostForPayer(payerId?: string, fallback = 123): number {
	if (!payerId) return fallback;
	const cost = SESSION_COST_BY_PAYER_ID[payerId];
	return typeof cost === "number" ? cost : fallback;
} 