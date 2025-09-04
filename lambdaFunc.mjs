//NIRVANA SEND AND RECEIVE USER DATA - UPDATED
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const secretsClient = new SecretsManagerClient({ region: "us-east-1" });
const lambdaClient = new LambdaClient({ region: "us-east-2" });

const stage = process.env.STAGE || "stg";
const secretName = `dev/nirvanaKey/${stage}`;

let nirvanaApiKey;

export const handler = async (event) => {
  console.log("=== Incoming Event ===");
  console.log(JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      },
      body: ""
    };
  }

  // Get API key from Secrets Manager
  if (!nirvanaApiKey) {
    try {
      const secretResponse = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretName }));
      nirvanaApiKey = JSON.parse(secretResponse.SecretString).nirvana_api_key;
    } catch (err) {
      console.error("❌ Secret fetch error:", err);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Failed to retrieve API key" })
      };
    }
  }

  // Parse incoming payload
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    console.error("❌ Payload parse error:", err);
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Invalid JSON in request" })
    };
  }

  // Validate and format date of birth
  const dobFormatted = payload?.subscriber?.dateOfBirth;
  console.log("Received DOB from frontend:", dobFormatted);
  
  if (!dobFormatted || typeof dobFormatted !== 'string' || dobFormatted.length !== 8) {
    console.error("❌ Invalid subscriber.dateOfBirth:", dobFormatted);
    return {
      statusCode: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "subscriber.dateOfBirth must be in YYYYMMDD format" })
    };
  }

  // Convert YYYYMMDD to YYYY-MM-DD for Nirvana
  const dobForNirvana = `${dobFormatted.substring(0, 4)}-${dobFormatted.substring(4, 6)}-${dobFormatted.substring(6, 8)}`;

  // Prepare Nirvana API request
  const nirvanaPayload = {
    provider_npi: payload.provider?.npi || "1669282885", // Using the NPI from your curl example
    provider_session_cost: payload.provider?.sessionCost || 20000, // Default $200.00 in cents
    payer_id: payload.tradingPartnerServiceId || payload.payer?.id,
    member_id: payload.subscriber?.memberId,
    member_dob: dobForNirvana,
    member_first_name: payload.subscriber?.firstName,
    member_last_name: payload.subscriber?.lastName,
    cpt_code: payload.cptCode,
    in_network: payload.inNetwork !== false // Default to true unless explicitly false
  };

  // Add optional fields if present
  if (payload.modalityCode) {
    nirvanaPayload.modality_code = payload.modalityCode;
  }
  if (payload.groupNumber || payload.subscriber?.groupNumber) {
    nirvanaPayload.group_number = payload.groupNumber || payload.subscriber.groupNumber;
  }

  console.log("=== Sending Payload to Nirvana ===");
  console.log(JSON.stringify(nirvanaPayload, null, 2));

  try {
    const nirvanaRes = await fetch("https://coverage-api.meetnirvana.com/v1/estimate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "accept": "application/json",
        "apikey": nirvanaApiKey
      },
      body: JSON.stringify(nirvanaPayload)
    });

    const responseBody = await nirvanaRes.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch {
      data = { raw: responseBody };
    }

    console.log("=== Nirvana Response ===");
    console.log("Status Code:", nirvanaRes.status);
    console.log(JSON.stringify(data, null, 2));

    if (nirvanaRes.status !== 200) {
      return {
        statusCode: nirvanaRes.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Nirvana API error", details: data })
      };
    }

    // Transform data for Lambda B (IntakeQ)
    const transformedData = {
      // Subscriber info with Nirvana demographics merged
      subscriber: {
        firstName: data.demographics?.first_name || payload.subscriber?.firstName,
        lastName: data.demographics?.last_name || payload.subscriber?.lastName,
        dateOfBirth: payload.subscriber?.dateOfBirth, // Keep original YYYYMMDD for IntakeQ
        memberId: data.demographics?.member_id || payload.subscriber?.memberId,
        gender: data.demographics?.gender || payload.subscriber?.gender,
        address: {
          address1: data.demographics?.address?.street_line_1 || payload.subscriber?.address?.address1 || "",
          address2: data.demographics?.address?.street_line_2 || payload.subscriber?.address?.address2 || "",
          city: data.demographics?.address?.city || payload.subscriber?.address?.city || "",
          state: data.demographics?.address?.state || payload.subscriber?.address?.state || "",
          postalCode: data.demographics?.address?.zip || payload.subscriber?.address?.postalCode || ""
        },
        groupNumber: data.group_id || payload.subscriber?.groupNumber || ""
      },
      
      // Payer information
      payer: {
        id: data.payer_id || payload.tradingPartnerServiceId,
        name: data.plan_name || payload.payer?.name || "Unknown Payer"
      },
      
      // Original trading partner ID for reference
      tradingPartnerServiceId: payload.tradingPartnerServiceId,
      
      // Transform benefits for compatibility with existing code
      benefitsInformation: [
        // Copay
        {
          code: "B",
          benefitAmount: data.copayment?.toString() || "0",
          inPlanNetworkIndicatorCode: "Y",
          serviceTypes: ["Mental Health"]
        },
        // Coinsurance
        {
          code: "A",
          benefitPercent: data.coinsurance ? (data.coinsurance / 100).toString() : "0",
          inPlanNetworkIndicatorCode: "Y",
          serviceTypes: ["Mental Health"]
        },
        // Deductible (already in dollars from Nirvana)
        {
          code: "C",
          benefitAmount: data.deductible ? (data.deductible / 100).toString() : "0",
          timeQualifier: "Contract",
          inPlanNetworkIndicatorCode: "Y",
          serviceTypes: ["Health Benefit Plan Coverage"]
        },
        // Out of Pocket Maximum (already in dollars from Nirvana)
        {
          code: "G",
          benefitAmount: data.oop_max ? (data.oop_max / 100).toString() : "0",
          timeQualifier: "Contract",
          inPlanNetworkIndicatorCode: "Y",
          serviceTypes: ["Health Benefit Plan Coverage"]
        },
        // Insurance Type
        {
          insuranceType: data.insurance_type || data.plan_type || "PPO",
          inPlanNetworkIndicatorCode: "Y",
          serviceTypes: ["Health Benefit Plan Coverage"]
        }
      ],
      
      // Pass ALL Nirvana data for complete information
      nirvanaData: {
        // Plan Information
        payerId: data.payer_id,
        planName: data.plan_name,
        planType: data.plan_type,
        insuranceType: data.insurance_type,
        groupName: data.group_name,
        groupId: data.group_id,
        planBeginDate: data.plan_begin_date,
        planEndDate: data.plan_end_date,
        eligibilityEndDate: data.eligibility_end_date,
        
        // Status Information
        planStatus: data.plan_status,
        coverageStatus: data.coverage_status,
        mentalHealthCoverage: data.mental_health_coverage,
        
        // Financial Information (all in cents)
        copayment: data.copayment,
        coinsurance: data.coinsurance,
        deductible: data.deductible,
        remainingDeductible: data.remaining_deductible,
        oopMax: data.oop_max,
        remainingOopMax: data.remaining_oop_max,
        
        // Benefit Structure
        benefitStructure: data.benefit_structure,
        memberObligation: data.member_obligation,
        payerObligation: data.payer_obligation,
        
        // Deductible-specific obligations
        preDeductibleMemberObligation: data.pre_deductible_member_obligation,
        preDeductiblePayerObligation: data.pre_deductible_payer_obligation,
        postDeductibleMemberObligation: data.post_deductible_member_obligation,
        postDeductiblePayerObligation: data.post_deductible_payer_obligation,
        
        // OOP Max-specific obligations
        postOopMaxMemberObligation: data.post_oop_max_member_obligation,
        postOopMaxPayerObligation: data.post_oop_max_payer_obligation,
        
        // Session tracking
        remainingSessionsBeforeDeductible: data.remaining_sessions_before_deductible,
        remainingSessionsBeforeOopMax: data.remaining_sessions_before_oop_max,
        
        // Telehealth information
        telehealth: data.telehealth,
        
        // Additional info
        feeSchedule: data.fee_schedule,
        qmbStatus: data.qmb_status,
        thirdPartyPayer: data.third_party_payer,
        planResetSoon: data.plan_reset_soon,
        resetBenefitsStatus: data.reset_benefits_status,
        resetBenefits: data.reset_benefits,
        additionalPolicy: data.additional_policy,
        
        // Relationship info
        relationshipToSubscriber: data.relationship_to_subscriber,
        subscriberDemographics: data.subscriber_demographics
      }
    };

    // Convert dateOfBirth to timestamp for IntakeQ
    try {
      const dobStr = transformedData.subscriber.dateOfBirth;
      if (dobStr && dobStr.length === 8) {
        const year = parseInt(dobStr.substring(0, 4));
        const month = parseInt(dobStr.substring(4, 6)) - 1; // JS months are 0-indexed
        const day = parseInt(dobStr.substring(6, 8));
        const convertedDOB = new Date(Date.UTC(year, month, day)).getTime();
        transformedData.subscriber.dateOfBirth = convertedDOB;
      }
    } catch (err) {
      console.warn("⚠️ Failed to convert DOB for IntakeQ:", err);
    }

    // Invoke Lambda B (IntakeQ) asynchronously
    try {
      await lambdaClient.send(new InvokeCommand({
        FunctionName: "solhealth-intakeq-createclient",
        InvocationType: "Event", // Async invocation
        Payload: Buffer.from(JSON.stringify(transformedData))
      }));
      console.log("✅ Invoked Lambda B with complete Nirvana data");
    } catch (invokeErr) {
      console.error("❌ Failed to invoke Lambda B:", invokeErr);
      // Don't fail the whole request if Lambda B invocation fails
    }

    // Return formatted response to frontend
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        success: true,
        benefits: {
          // Financial amounts formatted for display
          copay: `$${data.copayment ? (data.copayment / 100).toFixed(2) : "0.00"}`,
          deductible: `$${data.deductible ? (data.deductible / 100).toFixed(2) : "0.00"}`,
          remainingDeductible: `$${data.remaining_deductible ? (data.remaining_deductible / 100).toFixed(2) : "0.00"}`,
          coinsurance: `${data.coinsurance || 0}%`,
          oopMax: `$${data.oop_max ? (data.oop_max / 100).toFixed(2) : "0.00"}`,
          remainingOopMax: `$${data.remaining_oop_max ? (data.remaining_oop_max / 100).toFixed(2) : "0.00"}`,
          memberObligation: `$${data.member_obligation ? (data.member_obligation / 100).toFixed(2) : "0.00"}`,
          payerObligation: `$${data.payer_obligation ? (data.payer_obligation / 100).toFixed(2) : "0.00"}`,
          benefitStructure: data.benefit_structure,
          preDeductibleCost: `$${data.pre_deductible_member_obligation ? (data.pre_deductible_member_obligation / 100).toFixed(2) : "0.00"}`,
          postDeductibleCost: `$${data.post_deductible_member_obligation ? (data.post_deductible_member_obligation / 100).toFixed(2) : "0.00"}`,
          postOopMaxCost: `$${data.post_oop_max_member_obligation ? (data.post_oop_max_member_obligation / 100).toFixed(2) : "0.00"}`,
          sessionsBeforeDeductible: data.remaining_sessions_before_deductible,
          sessionsBeforeOopMax: data.remaining_sessions_before_oop_max
        },
        subscriber: {
          firstName: data.demographics?.first_name || payload.subscriber?.firstName,
          lastName: data.demographics?.last_name || payload.subscriber?.lastName,
          dateOfBirth: payload.subscriber?.dateOfBirth, // Keep original YYYYMMDD format
          memberId: data.demographics?.member_id || payload.subscriber?.memberId,
          gender: data.demographics?.gender,
          relationshipToSubscriber: data.relationship_to_subscriber,
          address: {
            streetLine1: data.demographics?.address?.street_line_1 || "",
            streetLine2: data.demographics?.address?.street_line_2 || "",
            city: data.demographics?.address?.city || "",
            state: data.demographics?.address?.state || "",
            zip: data.demographics?.address?.zip || "",
            // Formatted address for IntakeQ
            fullAddress: [
              data.demographics?.address?.street_line_1,
              data.demographics?.address?.street_line_2
            ].filter(Boolean).join(" ") + 
            (data.demographics?.address?.city ? `, ${data.demographics.address.city}` : "") +
            (data.demographics?.address?.state ? ` ${data.demographics.address.state}` : "") +
            (data.demographics?.address?.zip ? ` ${data.demographics.address.zip}` : "")
          }
        },
        coverage: {
          payerId: data.payer_id,
          planName: data.plan_name,
          planType: data.plan_type,
          planStatus: data.plan_status,
          coverageStatus: data.coverage_status,
          insuranceType: data.insurance_type,
          mentalHealthCoverage: data.mental_health_coverage,
          groupName: data.group_name,
          groupId: data.group_id,
          planDates: {
            begin: data.plan_begin_date,
            end: data.plan_end_date,
            eligibilityEnd: data.eligibility_end_date
          },
          additionalPolicy: data.additional_policy,
          feeSchedule: data.fee_schedule,
          qmbStatus: data.qmb_status,
          thirdPartyPayer: data.third_party_payer
        },
        telehealth: data.telehealth ? {
          coinsurance: `${data.telehealth.coinsurance || 0}%`,
          copayment: data.telehealth.copayment ? `$${(data.telehealth.copayment / 100).toFixed(2)}` : null,
          benefitStructure: data.telehealth.benefit_structure
        } : null,
        planBenefits: {
          resetBenefitsStatus: data.reset_benefits_status,
          resetBenefits: data.reset_benefits,
          planResetSoon: data.plan_reset_soon
        },
        // Include raw cents values for precise calculations
        rawFinancials: {
          copayment: data.copayment,
          coinsurance: data.coinsurance,
          deductible: data.deductible,
          remainingDeductible: data.remaining_deductible,
          oopMax: data.oop_max,
          remainingOopMax: data.remaining_oop_max,
          memberObligation: data.member_obligation,
          payerObligation: data.payer_obligation,
          preDeductibleMemberObligation: data.pre_deductible_member_obligation,
          preDeductiblePayerObligation: data.pre_deductible_payer_obligation,
          postDeductibleMemberObligation: data.post_deductible_member_obligation,
          postDeductiblePayerObligation: data.post_deductible_payer_obligation,
          postOopMaxMemberObligation: data.post_oop_max_member_obligation,
          postOopMaxPayerObligation: data.post_oop_max_payer_obligation
        },
        // Complete Nirvana response for debugging/future use
        rawNirvanaResponse: data
      })
    };
  } catch (err) {
    console.error("❌ Nirvana request failed:", err);
    return {
      statusCode: 502,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Nirvana API call failed", details: err.message })
    };
  }
};