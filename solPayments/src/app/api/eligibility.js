const BACKEND_URL = "https://spr5tkpvok.execute-api.us-east-2.amazonaws.com/dev/stedi-eligibility";

export async function checkEligibility(data) {
  // ============== ELIGIBILITY API LOGGING ==============
  console.log('🌐 ==========================================');
  console.log('🌐 ELIGIBILITY API - NETWORK REQUEST');
  console.log('🌐 ==========================================');
  
  console.log('📡 REQUEST DETAILS:', {
    url: BACKEND_URL,
    method: 'POST',
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
  });
  
  console.log('📤 PAYLOAD BEING SENT TO LAMBDA:', JSON.stringify(data, null, 2));
  
  console.log('🔍 PAYLOAD ANALYSIS:', {
    hasControlNumber: !!data.controlNumber,
    controlNumber: data.controlNumber,
    tradingPartnerServiceId: data.tradingPartnerServiceId,
    hasProvider: !!data.provider,
    providerDetails: data.provider ? {
      organizationName: data.provider.organizationName,
      npi: data.provider.npi,
      sessionCost: data.provider.sessionCost,
      sessionCostType: typeof data.provider.sessionCost
    } : null,
    hasSubscriber: !!data.subscriber,
    subscriberDetails: data.subscriber ? {
      firstName: data.subscriber.firstName,
      lastName: data.subscriber.lastName,
      dateOfBirth: data.subscriber.dateOfBirth,
      dateOfBirthLength: data.subscriber.dateOfBirth?.length,
      dateOfBirthFormat: data.subscriber.dateOfBirth?.length === 8 ? 'YYYYMMDD' : 'Unknown',
      memberId: data.subscriber.memberId,
      memberIdLength: data.subscriber.memberId?.length
    } : null
  });
  
  console.log('🌐 ==========================================');
  
  // Don't transform the date - Lambda A expects YYYYMMDD and will handle the conversion to YYYY-MM-DD for Nirvana
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  console.log('📥 RESPONSE DETAILS:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    url: response.url
  });

  let json;
  try {
    json = await response.json();
    console.log('📥 RESPONSE BODY:', JSON.stringify(json, null, 2));
  } catch (parseError) {
    console.error('❌ JSON PARSE ERROR:', {
      parseError,
      responseStatus: response.status,
      responseText: await response.text()
    });
    throw new Error("Received invalid JSON from server");
  }

  if (!response.ok) {
    console.error('❌ API ERROR RESPONSE:', {
      status: response.status,
      statusText: response.statusText,
      errorBody: json,
      originalPayload: data
    });
    console.log('🌐 ==========================================');
    throw new Error(json.error || json.message || "Eligibility check failed");
  }

  console.log('✅ ELIGIBILITY CHECK SUCCESSFUL');
  console.log('🌐 ==========================================');
  
  return json;
}