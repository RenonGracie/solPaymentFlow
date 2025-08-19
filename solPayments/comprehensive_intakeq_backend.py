"""
Comprehensive IntakeQ Integration Backend

This Flask backend handles comprehensive client data for IntakeQ integration.
It maps all available client fields to IntakeQ's expected structure including:
- Basic demographics (name, email, phone, address)
- Mental health screening scores (PHQ-9, GAD-7)
- Substance use screening
- Therapist preferences
- Insurance information and benefits
- Custom fields for tracking and analytics

Environment Variables Required:
- CASH_PAY_INTAKEQ_API_KEY: IntakeQ API key for cash paying clients
- INSURANCE_INTAKEQ_API_KEY: IntakeQ API key for insurance clients

API Endpoints:
- POST /intakeq/create-client: Creates comprehensive IntakeQ client profile
- GET /intakeq/client: Retrieves client by email

Expected IntakeQ Custom Fields:
- brop: Insurance Type (Cash Pay/Insurance)
- 791z: Copay Field
- v5wl: Deductible Field
- 1rd4: Coinsurance Field
- ii1b: Out Of Pocket Field
- 2iwu: Remaining Deductible
- vpum: Remaining OOP Max
- uk2k: Member Obligation
- pkiu: Payer Obligation
- 801h: Benefit Structure
"""
import os
import uuid
import json
import logging
from urllib.parse import urlencode
from typing import Dict, List, Optional, Any

import requests
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)
intakeq_forms_bp = Blueprint("intakeq_forms", __name__)

# IntakeQ API endpoints
INTAKEQ_BASE_URL = "https://intakeq.com/api/v1"

# Custom field mappings for IntakeQ
INTAKEQ_CUSTOM_FIELDS = {
    'copay': '791z',
    'deductible': 'v5wl', 
    'coinsurance': '1rd4',
    'out_of_pocket_max': 'ii1b',
    'remaining_deductible': '2iwu',
    'remaining_oop_max': 'vpum',
    'member_obligation': 'uk2k',
    'payer_obligation': 'pkiu',
    'insurance_type': 'brop',
    'benefit_structure': '801h',
    'plan_status': 'kj4y',
    'coverage_status': 'ch4e',
    'mental_health_coverage': 'q3lb'
}


def get_intakeq_api_key(payment_type: str) -> Optional[str]:
    """Get the appropriate IntakeQ API key based on payment type."""
    if payment_type == 'cash_pay':
        return os.getenv('CASH_PAY_INTAKEQ_API_KEY')
    elif payment_type == 'insurance':
        return os.getenv('INSURANCE_INTAKEQ_API_KEY')
    else:
        logger.error(f"Unknown payment type: {payment_type}")
        return None


def prepare_intakeq_payload(client_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prepare comprehensive IntakeQ payload from client data.
    Maps all available fields to IntakeQ's expected structure.
    """
    # Extract basic info with fallbacks
    first_name = client_data.get('preferred_name') or client_data.get('first_name') or ''
    last_name = client_data.get('last_name') or ''
    email = client_data.get('email') or ''
    
    # Build the base payload
    payload = {
        "FirstName": first_name,
        "LastName": last_name,
        "Email": email,
        "Phone": client_data.get('phone', ''),
        "MobilePhone": client_data.get('mobile_phone', ''),
        "DateOfBirth": client_data.get('date_of_birth'),
        "Gender": client_data.get('gender', ''),
        
        # Address fields
        "StreetAddress": client_data.get('street_address', ''),
        "City": client_data.get('city', ''),
        "State": client_data.get('state', ''),
        "PostalCode": client_data.get('postal_code', ''),
        "Country": client_data.get('country', 'USA'),
        
        # Additional client info
        "ExternalClientId": client_data.get('response_id'),
        "AdditionalInformation": f"Sol Health Response ID: {client_data.get('response_id', '')}"
    }
    
    # Prepare custom fields
    custom_fields = []
    
    # Insurance type field
    insurance_type = "Insurance" if client_data.get('payment_type') == 'insurance' else "Cash Pay"
    custom_fields.append({
        "FieldId": INTAKEQ_CUSTOM_FIELDS['insurance_type'],
        "Value": insurance_type
    })
    
    # Insurance-specific fields
    if client_data.get('payment_type') == 'insurance':
        insurance_fields = {
            'copay': client_data.get('copay'),
            'deductible': client_data.get('deductible'),
            'coinsurance': client_data.get('coinsurance'),
            'out_of_pocket_max': client_data.get('out_of_pocket_max'),
            'remaining_deductible': client_data.get('remaining_deductible'),
            'remaining_oop_max': client_data.get('remaining_oop_max'),
            'member_obligation': client_data.get('member_obligation'),
            'benefit_structure': client_data.get('benefit_structure')
        }
        
        for field_name, value in insurance_fields.items():
            if value and field_name in INTAKEQ_CUSTOM_FIELDS:
                custom_fields.append({
                    "FieldId": INTAKEQ_CUSTOM_FIELDS[field_name],
                    "Value": str(value)
                })
    
    # Mental health screening scores (PHQ-9)
    phq9_scores = client_data.get('phq9_scores', {})
    if phq9_scores and any(phq9_scores.values()):
        phq9_summary = []
        for question, score in phq9_scores.items():
            if score:
                phq9_summary.append(f"{question}: {score}")
        
        if phq9_summary:
            current_info = payload.get("AdditionalInformation", "")
            payload["AdditionalInformation"] = f"{current_info}\n\nPHQ-9 Scores:\n" + "\n".join(phq9_summary)
    
    # Anxiety screening scores (GAD-7)
    gad7_scores = client_data.get('gad7_scores', {})
    if gad7_scores and any(gad7_scores.values()):
        gad7_summary = []
        for question, score in gad7_scores.items():
            if score:
                gad7_summary.append(f"{question}: {score}")
        
        if gad7_summary:
            current_info = payload.get("AdditionalInformation", "")
            payload["AdditionalInformation"] = f"{current_info}\n\nGAD-7 Scores:\n" + "\n".join(gad7_summary)
    
    # Substance use information
    substance_info = []
    if client_data.get('alcohol_frequency'):
        substance_info.append(f"Alcohol use: {client_data['alcohol_frequency']}")
    if client_data.get('recreational_drugs_frequency'):
        substance_info.append(f"Recreational drugs: {client_data['recreational_drugs_frequency']}")
    
    if substance_info:
        current_info = payload.get("AdditionalInformation", "")
        payload["AdditionalInformation"] = f"{current_info}\n\nSubstance Use:\n" + "\n".join(substance_info)
    
    # Therapist preferences
    preferences_info = []
    if client_data.get('therapist_gender_preference'):
        preferences_info.append(f"Gender preference: {client_data['therapist_gender_preference']}")
    if client_data.get('therapist_specialization'):
        specializations = client_data['therapist_specialization']
        if isinstance(specializations, list):
            preferences_info.append(f"Specialization preferences: {', '.join(specializations)}")
    if client_data.get('what_brings_you'):
        preferences_info.append(f"What brings you here: {client_data['what_brings_you']}")
    
    if preferences_info:
        current_info = payload.get("AdditionalInformation", "")
        payload["AdditionalInformation"] = f"{current_info}\n\nTherapist Preferences:\n" + "\n".join(preferences_info)
    
    # Demographics and background
    demo_info = []
    if client_data.get('age'):
        demo_info.append(f"Age: {client_data['age']}")
    if client_data.get('race_ethnicity'):
        race_eth = client_data['race_ethnicity']
        if isinstance(race_eth, list):
            demo_info.append(f"Race/Ethnicity: {', '.join(race_eth)}")
    if client_data.get('university'):
        demo_info.append(f"University: {client_data['university']}")
    if client_data.get('referred_by'):
        demo_info.append(f"Referred by: {client_data['referred_by']}")
    
    if demo_info:
        current_info = payload.get("AdditionalInformation", "")
        payload["AdditionalInformation"] = f"{current_info}\n\nDemographics:\n" + "\n".join(demo_info)
    
    # Add custom fields to payload
    if custom_fields:
        payload["CustomFields"] = custom_fields
    
    return payload


@intakeq_forms_bp.route("/intakeq/create-client", methods=["POST"])
def create_intakeq_client():
    """Create a comprehensive client profile in IntakeQ system."""
    try:
        client_data = request.get_json() or {}
        
        # Enhanced logging
        logger.info("=" * 60)
        logger.info("📋 [COMPREHENSIVE INTAKEQ CLIENT CREATION]")
        logger.info(f"  Client: {client_data.get('first_name')} {client_data.get('last_name')}")
        logger.info(f"  Preferred Name: {client_data.get('preferred_name')}")
        logger.info(f"  Email: {client_data.get('email')}")
        logger.info(f"  Payment Type: {client_data.get('payment_type')}")
        logger.info(f"  Response ID: {client_data.get('response_id')}")
        logger.info(f"  Total Fields Received: {len(client_data)}")
        
        # Log data availability
        has_phq9 = bool(client_data.get('phq9_scores') and any(client_data['phq9_scores'].values()))
        has_gad7 = bool(client_data.get('gad7_scores') and any(client_data['gad7_scores'].values()))
        has_insurance = bool(client_data.get('insurance_provider'))
        has_preferences = bool(client_data.get('therapist_gender_preference') or client_data.get('therapist_specialization'))
        
        logger.info(f"  Data Completeness:")
        logger.info(f"    PHQ-9 Scores: {'✓' if has_phq9 else '✗'}")
        logger.info(f"    GAD-7 Scores: {'✓' if has_gad7 else '✗'}")
        logger.info(f"    Insurance Data: {'✓' if has_insurance else '✗'}")
        logger.info(f"    Therapist Preferences: {'✓' if has_preferences else '✗'}")
        
        # Determine API key
        payment_type = client_data.get('payment_type', 'cash_pay')
        intakeq_api_key = get_intakeq_api_key(payment_type)
        
        if not intakeq_api_key:
            error_msg = f"Missing IntakeQ API key for payment type: {payment_type}"
            logger.error(f"❌ {error_msg}")
            return jsonify({"error": error_msg}), 500

        logger.info(f"  🔑 API Key Status: Found key for {payment_type} (length: {len(intakeq_api_key)})")
        
        # Validate essential fields
        effective_first_name = client_data.get('preferred_name') or client_data.get('first_name') or ''
        effective_last_name = client_data.get('last_name') or ''
        effective_email = client_data.get('email') or ''
        
        if not effective_first_name or not effective_email:
            missing_fields = []
            if not effective_first_name: missing_fields.append('first_name/preferred_name')
            if not effective_email: missing_fields.append('email')
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            logger.error(f"❌ Validation failed: {error_msg}")
            return jsonify({"error": error_msg}), 400
        
        # Prepare comprehensive IntakeQ payload
        logger.info("🏗️  Preparing comprehensive IntakeQ payload...")
        intakeq_payload = prepare_intakeq_payload(client_data)
        
        logger.info(f"  📦 Payload prepared:")
        logger.info(f"    Name: {intakeq_payload.get('FirstName')} {intakeq_payload.get('LastName')}")
        logger.info(f"    Email: {intakeq_payload.get('Email')}")
        logger.info(f"    Phone: {intakeq_payload.get('Phone')}")
        logger.info(f"    State: {intakeq_payload.get('State')}")
        logger.info(f"    External ID: {intakeq_payload.get('ExternalClientId')}")
        logger.info(f"    Custom Fields: {len(intakeq_payload.get('CustomFields', []))}")
        logger.info(f"    Additional Info Length: {len(intakeq_payload.get('AdditionalInformation', ''))}")
        
        # Make request to IntakeQ
        headers = {
            "X-API-KEY": intakeq_api_key,
            "Content-Type": "application/json"
        }
        
        logger.info(f"🚀 Making request to IntakeQ API...")
        logger.info(f"   URL: {INTAKEQ_BASE_URL}/clients")
        logger.info(f"   Headers: {dict((k, v[:10] + '...' if k == 'X-API-KEY' else v) for k, v in headers.items())}")
        
        response = requests.post(
            f"{INTAKEQ_BASE_URL}/clients",
            headers=headers,
            json=intakeq_payload,
            timeout=60
        )
        
        logger.info(f"📡 IntakeQ API Response:")
        logger.info(f"   Status Code: {response.status_code}")
        logger.info(f"   Response Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            response_data = response.json()
            client_id = response_data.get("ClientId")
            intake_url = f"https://intakeq.com/new/{client_id}" if client_id else None
            
            logger.info("✅ IntakeQ client created successfully!")
            logger.info(f"   Client ID: {client_id}")
            logger.info(f"   Intake URL: {intake_url}")
            logger.info("=" * 60)
            
            return jsonify({
                "client_id": client_id,
                "intake_url": intake_url,
                "intakeq_response": response_data
            }), 201
            
        else:
            error_text = response.text
            logger.error(f"❌ IntakeQ API error: {response.status_code} - {error_text}")
            
            # Try to parse error details
            try:
                error_json = response.json()
                logger.error(f"   Error details: {json.dumps(error_json, indent=2)}")
            except:
                pass
            
            return jsonify({
                "error": f"IntakeQ API error: {response.status_code} - {error_text}"
            }), 500
            
    except requests.exceptions.Timeout:
        error_msg = "IntakeQ API request timed out"
        logger.error(f"❌ {error_msg}")
        return jsonify({"error": error_msg}), 504
        
    except requests.exceptions.RequestException as e:
        error_msg = f"IntakeQ API request failed: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return jsonify({"error": error_msg}), 500
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return jsonify({"error": error_msg}), 500


@intakeq_forms_bp.route("/intakeq/client", methods=["GET"])
def get_intakeq_client():
    """Retrieve an IntakeQ client by email."""
    try:
        email = request.args.get('email')
        payment_type = request.args.get('payment_type', 'cash_pay')
        
        if not email:
            return jsonify({"error": "Email parameter is required"}), 400
        
        logger.info(f"🔍 Searching for IntakeQ client: {email} ({payment_type})")
        
        # Get API key
        intakeq_api_key = get_intakeq_api_key(payment_type)
        if not intakeq_api_key:
            error_msg = f"Missing IntakeQ API key for payment type: {payment_type}"
            logger.error(f"❌ {error_msg}")
            return jsonify({"error": error_msg}), 500
        
        # Search for client
        headers = {"X-API-KEY": intakeq_api_key}
        params = {"email": email}
        
        response = requests.get(
            f"{INTAKEQ_BASE_URL}/clients",
            headers=headers,
            params=params,
            timeout=30
        )
        
        if response.status_code == 200:
            clients = response.json()
            logger.info(f"✅ Found {len(clients)} client(s) for email: {email}")
            return jsonify(clients), 200
        else:
            logger.error(f"❌ IntakeQ client search failed: {response.status_code} - {response.text}")
            return jsonify({"error": f"IntakeQ API error: {response.status_code}"}), response.status_code
            
    except Exception as e:
        error_msg = f"Error searching for IntakeQ client: {str(e)}"
        logger.error(f"❌ {error_msg}")
        return jsonify({"error": error_msg}), 500 