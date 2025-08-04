// src/app/api/survey/submit/route.ts

import { NextRequest, NextResponse } from 'next/server';

// This endpoint forwards survey submissions to your Lambda function
export async function POST(request: NextRequest) {
  try {
    const surveyData = await request.json();

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'paymentType'];
    for (const field of requiredFields) {
      if (!surveyData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Forward to your Lambda endpoint
    const lambdaResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/survey/responses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyData),
      }
    );

    if (!lambdaResponse.ok) {
      const error = await lambdaResponse.text();
      console.error('Lambda error:', error);
      return NextResponse.json(
        { error: 'Failed to submit survey' },
        { status: lambdaResponse.status }
      );
    }

    const result = await lambdaResponse.json();
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Survey submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}