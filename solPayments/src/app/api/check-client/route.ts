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
    const response = await fetch(
      `https://api.stg.solhealth.co/clients_signup?response_id=${responseId}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Sol-Payments/1.0'
        }
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('API check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check client status' },
      { status: 500 }
    );
  }
}