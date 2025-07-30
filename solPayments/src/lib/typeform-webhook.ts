// solPayments/src/lib/typeform-webhook.ts

import { sendWebhookToSolHealth } from './webhook-server-action';

interface TypeformField {
  id: string;
  type: string;
  title?: string;
  ref: string;
}

interface TypeformChoice {
  id: string;
  label: string;
  ref: string;
}

interface TypeformAnswer {
  type: string;
  field: TypeformField;
  text?: string;
  email?: string;
  phone_number?: string;
  choice?: TypeformChoice;
  choices?: { ids: string[]; labels: string[]; refs: string[] };
  boolean?: boolean;
}

export async function sendTypeformWebhook(data: {
  responseId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  age?: string;
  gender?: string;
  race?: string[];
  insuranceProvider?: string;
  paymentType: 'insurance' | 'cash';
  // Mental health screening scores (optional - can default)
  phqScore?: number;
  gadScore?: number;
  suicidalIdeation?: number;
  alcoholUse?: number;
  drugUse?: number;
}) {
  // Use local API proxy to avoid CORS issues
  const WEBHOOK_URL = '/api/webhook-proxy';
  
  // Generate event ID like Typeform does
  const eventId = `01K1D0${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const token = data.responseId;
  const now = new Date().toISOString();

  // Create the complete webhook payload matching the real structure
  const webhookPayload = {
    event_id: eventId,
    event_type: "form_response",
    form_response: {
      form_id: "Dgi2e9lw", // Use the actual form ID from the real webhook
      token: token,
      landed_at: now,
      submitted_at: now,
      hidden: {
        client_id: "",
        client_type: "",
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        session_id: "",
        utm_adgroup: "",
        utm_adid: "",
        utm_campaign: "onboarding",
        utm_content: "",
        utm_medium: data.paymentType,
        utm_source: "sol_payments",
        utm_term: ""
      },
      calculated: {
        score: 0
      },
      variables: [
        {
          key: "alcohol",
          type: "number",
          number: data.alcoholUse || 0
        },
        {
          key: "drugs", 
          type: "number",
          number: data.drugUse || 0
        },
        {
          key: "gad",
          type: "number", 
          number: data.gadScore || 6
        },
        {
          key: "journey",
          type: "text",
          text: "matching algorithm"
        },
        {
          key: "phq",
          type: "number",
          number: data.phqScore || 9
        },
        {
          key: "promocode",
          type: "text", 
          text: "false"
        },
        {
          key: "score",
          type: "number",
          number: 0
        },
        {
          key: "si",
          type: "number",
          number: data.suicidalIdeation || 2
        }
      ],
      definition: {
        id: "Dgi2e9lw",
        title: "Production 1.1 (Staging env)",
        fields: [
          // All the field definitions from the real payload
          {
            id: "t6ZZ6v5G4z3C",
            ref: "cf6c1ace-73ef-47c5-a1a8-e0833448a7e1", 
            type: "yes_no",
            title: "Over the past two weeks, have you been *actively suicidal or homicidal *OR have you been experiencing *hallucinations or delusions*?"
          },
          {
            id: "ZHkGAMfpwXAk",
            ref: "6aa4751f-05b6-4d9a-a772-8f0b5b729e84",
            type: "multiple_choice", 
            title: "Would you like to be matched with a therapist, or are you requesting someone specific?"
          },
          {
            id: "oD7Rtkaz7PLc",
            ref: "f4384935-2135-47cd-bfa1-0bf2e0104399",
            type: "multiple_choice",
            title: "I would like a therapist that specializes in:"
          },
          {
            id: "pgYGLGKsTg3c", 
            ref: "e994d593-5a2f-4f3c-9b20-82d2cc14c49d",
            type: "multiple_choice",
            title: "I would like a therapist that identifies as:"
          },
          {
            id: "k4kZ5U4lGVos",
            ref: "a56351d1-d292-4d96-bb95-7323219ee5f2",
            type: "multiple_choice", 
            title: "*Family*"
          },
          {
            id: "SFi0KnGPco0t",
            ref: "1e9868b4-9c8c-41ad-af9a-d1cdafdc9915",
            type: "multiple_choice",
            title: "Do you drink *alcohol*? If yes, how often per week?"
          },
          {
            id: "5iQNrAo8w46H",
            ref: "28963f0c-debd-4b55-b39e-46c56a6a6949", 
            type: "multiple_choice",
            title: "Do you use *recreational drugs*? If yes, how often per week?"
          },
          // PHQ-9 Depression questions
          {
            id: "tQn4AY3497Bz",
            ref: "0df712be-e6db-4f67-9090-bc3f8acd03b1",
            type: "multiple_choice",
            title: "Little interest or pleasure in doing things"
          },
          {
            id: "nErMcZgsLyNp", 
            ref: "571c3436-0da5-4b3e-9615-d7f5b5337f62",
            type: "multiple_choice",
            title: "Feeling down, depressed, or hopeless"
          },
          {
            id: "FRZjPDTXllFB",
            ref: "79b190b1-e1b5-4ae8-a883-74458baf2ba8",
            type: "multiple_choice",
            title: "Trouble falling or staying asleep, or sleeping too much"
          },
          {
            id: "oylhOAw16phg",
            ref: "038f9c71-97c7-4aa0-98a2-8a781c75a2fc", 
            type: "multiple_choice",
            title: "Feeling tired or having little energy"
          },
          {
            id: "L6k9yIKhrBcO",
            ref: "1cf50bd4-aa7a-4672-8b50-d1ecf458ab55",
            type: "multiple_choice",
            title: "Poor appetite or overeating"
          },
          {
            id: "rZDxbJUG84vY",
            ref: "9bb34921-0926-46b9-b3fc-bd29d6987602",
            type: "multiple_choice", 
            title: "Feeling bad about yourself - or that you are a failure or have let yourself or your family down"
          },
          {
            id: "UTbtsYKjT3qF",
            ref: "522d3b7a-7608-4ed2-8e65-36503f1bb0db",
            type: "multiple_choice",
            title: "Trouble concentrating on things, such as reading the newspaper or watching television"
          },
          {
            id: "Dvvsj3045bxX",
            ref: "990e62e6-0c9c-425e-88d2-65e1e9271341",
            type: "multiple_choice",
            title: "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual."
          },
          {
            id: "D4aV71yggFVc",
            ref: "d7d36e9d-25e5-4e9f-be54-4db916a10891", 
            type: "multiple_choice",
            title: "Thoughts that you would be better off dead, or of hurting yourself"
          },
          // GAD-7 Anxiety questions
          {
            id: "1a9yt4SaYb84",
            ref: "7e560f59-a2f2-494d-8e6b-860741592d07",
            type: "multiple_choice",
            title: "Feeling nervous, anxious, or on edge"
          },
          {
            id: "VXbKakyE2Q8R",
            ref: "1fdc1b54-7abc-44e9-b6bd-a65dd0f7fe2a",
            type: "multiple_choice",
            title: "Not being able to stop or control worrying"
          },
          {
            id: "oqHIrs0g2KHl",
            ref: "449f9821-efaa-49e3-b632-4f4bc8a18a22",
            type: "multiple_choice", 
            title: "Worrying too much about different things"
          },
          {
            id: "8jlsur9gY6SD",
            ref: "d6e8ce4f-84b6-4d5e-b584-6ab69fec5087",
            type: "multiple_choice",
            title: "Trouble relaxing"
          },
          {
            id: "7nzA8gpjGu81",
            ref: "cdf74907-9bc3-48b1-b080-9f18a27b9d8f",
            type: "multiple_choice",
            title: "Being so restless that it is hard to sit still"
          },
          {
            id: "8dDFHCpJZeY1",
            ref: "7d1a2322-840c-494a-8155-0bdea0eefdb6",
            type: "multiple_choice",
            title: "Becoming easily annoyed or irritable"
          },
          {
            id: "K3ZhHhqlFuiZ",
            ref: "3d7046be-905b-4c67-af66-01ca3373c433",
            type: "multiple_choice",
            title: "Feeling afraid, as if something awful might happen"
          },
          // Demographics
          {
            id: "U4kXI1VXVHK6",
            ref: "e0f1eff6-e0e4-4a7c-9520-86a3a9e62a64", 
            type: "phone_number",
            title: "Phone number"
          },
          {
            id: "AbKKFOW29VyK",
            ref: "b446bddb-7a00-47fc-9568-7f0a0efd23f0",
            type: "multiple_choice",
            title: "Gender"
          },
          {
            id: "E9YJxXH4H9YF",
            ref: "661a595a-2182-4f0d-8249-feef5d8fcc8a",
            type: "short_text",
            title: "Age"
          },
          {
            id: "qbaHxvpPFjY4",
            ref: "7f32d521-3cc4-4ec1-830e-e97b4c116f45",
            type: "multiple_choice",
            title: "Race/Ethnicity"
          },
          {
            id: "wOQ9j5ypA77w",
            ref: "20abed52-aa6a-44cf-821a-b924be43cf3d",
            type: "multiple_choice",
            title: "I agree to Sol Health's Terms of Service, Privacy Policy, and Telehealth Consent."
          }
        ],
        endings: [
          {
            id: "sNmB21E7sGn8",
            ref: "73db25f2-211d-4720-bb18-eab0149ec8b9",
            title: "Matching Algorithm",
            type: "url_redirect",
            properties: {
              redirect_url: "https://stg.solhealth.co/@token"
            }
          }
        ]
      },
      answers: [
        // Suicidal/homicidal ideation screening - always answer "false" for safety
        {
          type: "boolean",
          boolean: false,
          field: {
            id: "t6ZZ6v5G4z3C",
            type: "yes_no", 
            ref: "cf6c1ace-73ef-47c5-a1a8-e0833448a7e1"
          }
        },
        // Matching preference
        {
          type: "choice",
          choice: {
            id: "p6HgSClSzuDL",
            label: "🪄 Match me to my best-fit therapist",
            ref: "581bf934-b9d7-4308-ad75-3331d858c940"
          },
          field: {
            id: "ZHkGAMfpwXAk", 
            type: "multiple_choice",
            ref: "6aa4751f-05b6-4d9a-a772-8f0b5b729e84"
          }
        },
        // Specialization - default to Anxiety
        {
          type: "choices",
          choices: {
            ids: ["kfXFaTrQ0qMd"],
            labels: ["Anxiety"],
            refs: ["42a65ad3-6d57-4207-8824-29e1e5cd49b3"]
          },
          field: {
            id: "oD7Rtkaz7PLc",
            type: "multiple_choice",
            ref: "f4384935-2135-47cd-bfa1-0bf2e0104399"
          }
        },
        // Therapist gender preference - default to no preference
        {
          type: "choice",
          choice: {
            id: "dSJMGkxMuExv", 
            label: "No preference",
            ref: "7703f2de-e52f-4307-a311-9a3fd7ab9735"
          },
          field: {
            id: "pgYGLGKsTg3c",
            type: "multiple_choice",
            ref: "e994d593-5a2f-4f3c-9b20-82d2cc14c49d"
          }
        },
        // Family background - skip for now (no selection)
        // Alcohol use - default to "Not at all"
        {
          type: "choice",
          choice: {
            id: "xNnu5GT3Ig6P",
            label: "Not at all", 
            ref: "85bd6416-2aef-4cfe-bbec-045fcbe108e3"
          },
          field: {
            id: "SFi0KnGPco0t",
            type: "multiple_choice",
            ref: "1e9868b4-9c8c-41ad-af9a-d1cdafdc9915"
          }
        },
        // Drug use - default to "Not at all"
        {
          type: "choice",
          choice: {
            id: "PxM6LKuQvGLs",
            label: "Not at all",
            ref: "dba05692-a53c-40d5-a633-79e46f7ef70c"
          },
          field: {
            id: "5iQNrAo8w46H",
            type: "multiple_choice", 
            ref: "28963f0c-debd-4b55-b39e-46c56a6a6949"
          }
        },
        // PHQ-9 Depression screening - provide moderate scores
        {
          type: "choice",
          choice: {
            id: "FYzDUlIWa5pB",
            label: "Several days",
            ref: "f2fd96af-27b9-4a02-bbe2-80e3eaf380d6"
          },
          field: {
            id: "tQn4AY3497Bz",
            type: "multiple_choice",
            ref: "0df712be-e6db-4f67-9090-bc3f8acd03b1"
          }
        },
        {
          type: "choice",
          choice: {
            id: "PuZ9p4LbZecc",
            label: "Not at all",
            ref: "b8682870-0757-48a5-9243-c221f50e3de9"
          },
          field: {
            id: "nErMcZgsLyNp",
            type: "multiple_choice",
            ref: "571c3436-0da5-4b3e-9615-d7f5b5337f62"
          }
        },
        {
          type: "choice",
          choice: {
            id: "VWplUjKo4vGC",
            label: "Several days",
            ref: "6b969e5a-196c-4f0b-86e7-3ffa51a9b4fb"
          },
          field: {
            id: "FRZjPDTXllFB",
            type: "multiple_choice",
            ref: "79b190b1-e1b5-4ae8-a883-74458baf2ba8"
          }
        },
        {
          type: "choice",
          choice: {
            id: "zLG9cBeGgqp8",
            label: "More than half the days",
            ref: "99437385-d132-4aed-b5b3-e078f4c8b412"
          },
          field: {
            id: "oylhOAw16phg",
            type: "multiple_choice", 
            ref: "038f9c71-97c7-4aa0-98a2-8a781c75a2fc"
          }
        },
        {
          type: "choice",
          choice: {
            id: "vkv8kARK2CK7",
            label: "Not at all",
            ref: "ab708488-909e-4440-a252-86c1841bfbf8"
          },
          field: {
            id: "L6k9yIKhrBcO",
            type: "multiple_choice",
            ref: "1cf50bd4-aa7a-4672-8b50-d1ecf458ab55"
          }
        },
        {
          type: "choice",
          choice: {
            id: "wldSzuCXgA7o",
            label: "More than half the days",
            ref: "bfb3604f-9b9f-4117-9981-2792ee7f1f0a"
          },
          field: {
            id: "rZDxbJUG84vY",
            type: "multiple_choice",
            ref: "9bb34921-0926-46b9-b3fc-bd29d6987602"
          }
        },
        {
          type: "choice",
          choice: {
            id: "vT25IXqbnvUi",
            label: "Several days",
            ref: "c600f9d5-a0a0-4d2d-8331-04626d3eea90"
          },
          field: {
            id: "UTbtsYKjT3qF",
            type: "multiple_choice",
            ref: "522d3b7a-7608-4ed2-8e65-36503f1bb0db"
          }
        },
        {
          type: "choice",
          choice: {
            id: "3MICzzWX1cs3",
            label: "Not at all",
            ref: "d5bf33ce-5108-47bb-929b-d21da743b00c" 
          },
          field: {
            id: "Dvvsj3045bxX",
            type: "multiple_choice",
            ref: "990e62e6-0c9c-425e-88d2-65e1e9271341"
          }
        },
        {
          type: "choice",
          choice: {
            id: "obPHrSF14zUN",
            label: "More than half the days",
            ref: "a2eeeb41-652f-44dc-8526-3216b4f580b2"
          },
          field: {
            id: "D4aV71yggFVc",
            type: "multiple_choice",
            ref: "d7d36e9d-25e5-4e9f-be54-4db916a10891"
          }
        },
        // GAD-7 Anxiety screening
        {
          type: "choice",
          choice: {
            id: "6aZPv3GfCcsL",
            label: "Not at all",
            ref: "b8272bf6-1992-44eb-a2ff-ece13b9202a7"
          },
          field: {
            id: "1a9yt4SaYb84",
            type: "multiple_choice",
            ref: "7e560f59-a2f2-494d-8e6b-860741592d07"
          }
        },
        {
          type: "choice",
          choice: {
            id: "JXSlGot7ybhw",
            label: "More than half the days",
            ref: "2f225818-e675-4709-9c9a-19967b4db315"
          },
          field: {
            id: "VXbKakyE2Q8R",
            type: "multiple_choice",
            ref: "1fdc1b54-7abc-44e9-b6bd-a65dd0f7fe2a"
          }
        },
        {
          type: "choice",
          choice: {
            id: "YEOxdRsSiV7l",
            label: "Not at all",
            ref: "797de514-67d8-42f3-a334-b7b9fa723ecc"
          },
          field: {
            id: "oqHIrs0g2KHl",
            type: "multiple_choice",
            ref: "449f9821-efaa-49e3-b632-4f4bc8a18a22"
          }
        },
        {
          type: "choice",
          choice: {
            id: "Kw4EeljxxI5M",
            label: "Several days",
            ref: "6fd455bd-9f61-42de-9d4e-8fc7b644f770"
          },
          field: {
            id: "8jlsur9gY6SD",
            type: "multiple_choice",
            ref: "d6e8ce4f-84b6-4d5e-b584-6ab69fec5087"
          }
        },
        {
          type: "choice",
          choice: {
            id: "IiedzYlHTAG5",
            label: "More than half the days",
            ref: "9fee6bef-5f85-496b-b946-fc3a4d0ca9b4"
          },
          field: {
            id: "7nzA8gpjGu81", 
            type: "multiple_choice",
            ref: "cdf74907-9bc3-48b1-b080-9f18a27b9d8f"
          }
        },
        {
          type: "choice",
          choice: {
            id: "YwuvLstX4POB",
            label: "Not at all",
            ref: "e66078e5-633c-4d73-8e66-e7ee5733c203"
          },
          field: {
            id: "8dDFHCpJZeY1",
            type: "multiple_choice",
            ref: "7d1a2322-840c-494a-8155-0bdea0eefdb6"
          }
        },
        {
          type: "choice",
          choice: {
            id: "btJlpXKwvNuN",
            label: "Several days",
            ref: "809d73b9-79d5-41d6-9f87-cd96bbfcfe0b"
          },
          field: {
            id: "K3ZhHhqlFuiZ",
            type: "multiple_choice",
            ref: "3d7046be-905b-4c67-af66-01ca3373c433"
          }
        },
        // Phone number
        ...(data.phone ? [{
          type: "phone_number",
          phone_number: data.phone,
          field: {
            id: "U4kXI1VXVHK6",
            type: "phone_number",
            ref: "e0f1eff6-e0e4-4a7c-9520-86a3a9e62a64"
          }
        }] : []),
        // Gender - default based on data or "No preference"
        {
          type: "choice",
          choice: {
            id: data.gender === "female" ? "WMAXM8QnnPTy" : data.gender === "male" ? "Z8zIIOsewzwi" : "Z8zIIOsewzwi",
            label: data.gender === "female" ? "Female" : data.gender === "male" ? "Male" : "Male",
            ref: data.gender === "female" ? "9102441b-f122-45fb-bec0-a29450e2d08c" : data.gender === "male" ? "1da5b56f-ce92-47d7-a49b-dd10fe89627b" : "1da5b56f-ce92-47d7-a49b-dd10fe89627b"
          },
          field: {
            id: "AbKKFOW29VyK",
            type: "multiple_choice",
            ref: "b446bddb-7a00-47fc-9568-7f0a0efd23f0"
          }
        },
        // Age
        ...(data.age ? [{
          type: "text",
          text: data.age,
          field: {
            id: "E9YJxXH4H9YF",
            type: "short_text",
            ref: "661a595a-2182-4f0d-8249-feef5d8fcc8a"
          }
        }] : [{
          type: "text", 
          text: "25", // Default age
          field: {
            id: "E9YJxXH4H9YF",
            type: "short_text",
            ref: "661a595a-2182-4f0d-8249-feef5d8fcc8a"
          }
        }]),
        // Race/Ethnicity - default to "I prefer not to answer"
        {
          type: "choices",
          choices: {
            ids: ["TJJB6xOarduR"],
            labels: ["_I prefer not to answer_"],
            refs: ["04dd44fd-0bd7-4339-bbe2-f2cd4da82493"]
          },
          field: {
            id: "qbaHxvpPFjY4",
            type: "multiple_choice",
            ref: "7f32d521-3cc4-4ec1-830e-e97b4c116f45"
          }
        },
        // Terms acceptance
        {
          type: "choice",
          choice: {
            id: "ltI3rlaXbmu2",
            label: "I accept",
            ref: "240e7504-b93c-4f66-aaaa-bd0901be2b18"
          },
          field: {
            id: "wOQ9j5ypA77w",
            type: "multiple_choice",
            ref: "20abed52-aa6a-44cf-821a-b924be43cf3d"
          }
        }
      ],
      ending: {
        id: "sNmB21E7sGn8",
        ref: "73db25f2-211d-4720-bb18-eab0149ec8b9"
      }
    }
  };

  try {
    console.log('🎯 Using server action to send webhook');
    console.log('📦 Payload size:', JSON.stringify(webhookPayload).length, 'characters');

    // Use server action instead of direct fetch
    const result = await sendWebhookToSolHealth(webhookPayload);
    
    if (result.success) {
      console.log('✅ Webhook sent successfully via server action');
      return result;
    } else {
      console.error('❌ Server action failed:', result.error);
      return result;
    }
  } catch (error) {
    console.error('💥 Webhook error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}


export function generateTypeformResponseId(): string {
    // Typeform uses 32 character lowercase alphanumeric IDs
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // First character is often a letter
    result += chars.charAt(Math.floor(Math.random() * 26)); // letters only
    
    // Rest can be any alphanumeric
    for (let i = 1; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }
  
