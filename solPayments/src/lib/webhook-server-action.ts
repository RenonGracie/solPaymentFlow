// Create this file at: solPayments/src/lib/webhook-server-action.ts

'use server';

interface WebhookResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function sendWebhookToSolHealth(webhookData: unknown): Promise<WebhookResponse> {
  try {
    const WEBHOOK_URL = 'https://api.stg.solhealth.co/hook';
    
    console.log('🚀 Server Action: Proxying webhook to Sol Health API');
    console.log('📦 Payload size:', JSON.stringify(webhookData).length, 'characters');
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sol-Payments-Server-Action/1.0',
        'Typeform-Signature': 'server_action_signature' // Can include server-side only headers
      },
      body: JSON.stringify(webhookData)
    });

    const responseText = await response.text();
    console.log('✅ Sol Health API response:', response.status, responseText);

    if (!response.ok) {
      console.error('❌ Webhook failed:', response.status, responseText);
      return {
        success: false,
        error: `Webhook failed: ${response.status} - ${responseText}`
      };
    }

    // Try to parse response as JSON
    try {
      const result = JSON.parse(responseText);
      return { success: true, data: result };
    } catch {
      return { success: true, data: responseText };
    }
    
  } catch (error) {
    console.error('💥 Server Action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}