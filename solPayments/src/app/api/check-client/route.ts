// src/app/api/check-client/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const responseId = searchParams.get('response_id');

  if (!responseId) {
    return NextResponse.json(
      { error: 'response_id is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`🔍 Checking client status for response_id: ${responseId}`);
    
    // Use the correct Sol Health API endpoint
    const response = await fetch(
      `https://api.stg.solhealth.co/clients_signup?response_id=${responseId}`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Sol-Payments-Server/1.0'
        }
      }
    );

    const responseText = await response.text();
    console.log(`📡 Sol Health API response: ${response.status}`);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // If not JSON, return the text
      data = { message: responseText };
    }

    if (!response.ok) {
      console.error(`❌ API returned error: ${response.status}`, data);
      return NextResponse.json(
        { error: data.error || data.message || `API returned ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ API check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check client status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}