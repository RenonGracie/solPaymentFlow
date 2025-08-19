"""
IntakeQ Integration API

This module provides endpoints for managing IntakeQ client integration:

Endpoints:
- POST /intakeq/create-client: Create a new client in IntakeQ system
- GET /intakeq/client: Retrieve client information by email
- POST /intakeq_forms/mandatory_form: Send mandatory forms (legacy)

The IntakeQ integration supports both cash pay and insurance clients with
separate API keys configured via environment variables:
- CASH_PAY_INTAKEQ_API_KEY: For cash paying clients
- INSURANCE_INTAKEQ_API_KEY: For insurance clients

Client data includes:
- Basic information (name, email, phone, DOB)
- Payment type and insurance details
- Mental health screening scores (PHQ-9, GAD-7)
- Substance use screening (alcohol, drugs)
- Therapy preferences and specialization requests
- Demographics and background information
- Custom fields for tracking response IDs and preferences
"""
import json
import logging
import os
import time
import uuid
from datetime import datetime
from urllib.parse import urlencode

import requests
from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)
intakeq_forms_bp = Blueprint("intakeq_forms", __name__)

# Custom field mappings for IntakeQ (based on your example)
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
    'mental_health_coverage': 'q3lb',
    'sessions_before_deductible': 'wzm0',
    'sessions_before_oop_max': 'ozuf',
    'telehealth_coinsurance': 'mtyd',
    'telehealth_benefit_structure': '571k'
}

@intakeq_forms_bp.route("/intakeq/create-client", methods=["POST"])
def create_intakeq_client():
    """Create a new client in IntakeQ system with comprehensive field mapping."""
    try:
        client_data = request.get_json() or {}

        # Enhanced logging for comprehensive data
        logger.info("=" * 60)
        logger.info("📋 [COMPREHENSIVE INTAKEQ CLIENT CREATION]")
        logger.info(f"  Client: {client_data.get('first_name')} {client_data.get('last_name')}")
        logger.info(f"  Preferred Name: {client_data.get('preferred_name')}")
        logger.info(f"  Email: {client_data.get('email')}")
        logger.info(f"  Payment Type: {client_data.get('payment_type')}")
        logger.info(f"  Response ID: {client_data.get('response_id')}")
        logger.info(f"  Total Fields Received: {len(client_data)}")
        
        # Log data completeness
        has_phq9 = bool(client_data.get('phq9_scores') and any(client_data['phq9_scores'].values() if isinstance(client_data['phq9_scores'], dict) else []))
        has_gad7 = bool(client_data.get('gad7_scores') and any(client_data['gad7_scores'].values() if isinstance(client_data['gad7_scores'], dict) else []))
        has_insurance = bool(client_data.get('insurance_provider'))
        has_preferences = bool(client_data.get('therapist_gender_preference') or client_data.get('therapist_specialization'))
        has_substance_data = bool(client_data.get('alcohol_frequency') or client_data.get('recreational_drugs_frequency'))
        
        logger.info(f"  Data Completeness:")
        logger.info(f"    PHQ-9 Scores: {'✓' if has_phq9 else '✗'}")
        logger.info(f"    GAD-7 Scores: {'✓' if has_gad7 else '✗'}")
        logger.info(f"    Insurance Data: {'✓' if has_insurance else '✗'}")
        logger.info(f"    Therapist Preferences: {'✓' if has_preferences else '✗'}")
        logger.info(f"    Substance Use Data: {'✓' if has_substance_data else '✗'}")

        # Determine which IntakeQ API key to use based on payment type
        payment_type = client_data.get("payment_type", "cash_pay")
        cash_pay_key = os.getenv("CASH_PAY_INTAKEQ_API_KEY")
        insurance_key = os.getenv("INSURANCE_INTAKEQ_API_KEY")
        intakeq_api_key = cash_pay_key if payment_type == "cash_pay" else insurance_key

        if not intakeq_api_key:
            error_msg = f"Missing IntakeQ API key for payment type: {payment_type}"
            logger.error(f"❌ {error_msg}")
            return jsonify({"error": error_msg}), 500

        logger.info(f"  🔑 Using API key for: {payment_type} (length: {len(intakeq_api_key)})")

        # Build comprehensive IntakeQ payload
        intakeq_payload = build_comprehensive_intakeq_payload(client_data, payment_type)

        # Validate required fields
        required_fields = ["Email", "LastName"]
        missing_fields = [
            field for field in required_fields if not intakeq_payload.get(field)
        ]

        if not intakeq_payload.get("FirstName"):
            missing_fields.append("FirstName")

        if missing_fields:
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            logger.error(f"❌ {error_msg}")
            return jsonify({"error": error_msg}), 400

        logger.info(f"  📤 Sending comprehensive payload to IntakeQ API...")
        logger.info(f"    Payload keys: {list(intakeq_payload.keys())}")
        logger.info(f"    Custom fields count: {len(intakeq_payload.get('CustomFields', []))}")
        logger.info(f"    Additional info length: {len(intakeq_payload.get('AdditionalInformation', ''))}")

        # Call IntakeQ API
        headers = {
            "X-API-KEY": intakeq_api_key,  # Updated to correct header name
            "Content-Type": "application/json",
        }

        intakeq_response = requests.post(
            "https://intakeq.com/api/v1/clients",
            headers=headers,
            json=intakeq_payload,
            timeout=60,
        )

        logger.info(f"  📥 IntakeQ Response Status: {intakeq_response.status_code}")
        logger.info(f"  📥 Response Headers: {dict(intakeq_response.headers)}")

        if not intakeq_response.ok:
            error_text = intakeq_response.text
            logger.error(f"❌ IntakeQ API Error Details:")
            logger.error(f"    Status Code: {intakeq_response.status_code}")
            logger.error(f"    Response Text: {error_text}")
            
            # Try to parse detailed error response
            try:
                error_json = intakeq_response.json()
                logger.error(f"    Error JSON: {json.dumps(error_json, indent=2)}")
                error_msg = f"IntakeQ API error: {intakeq_response.status_code} - {error_json.get('message', error_text)}"
            except (json.JSONDecodeError, ValueError):
                error_msg = f"IntakeQ API error: {intakeq_response.status_code} - {error_text}"

            return jsonify({"error": error_msg}), 500

        try:
            result = intakeq_response.json()
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse IntakeQ response as JSON: {e}")
            return jsonify({"error": "Invalid JSON response from IntakeQ"}), 500

        # Extract client ID and intake URL
        client_id = result.get("ClientId") or result.get("Id") or result.get("id")
        intake_url = result.get("intake_url") or result.get("IntakeUrl")
        
        if not intake_url and client_id:
            intake_url = f"https://intakeq.com/new/{client_id}"

        logger.info(f"  ✅ Comprehensive client created successfully")
        logger.info(f"  Client ID: {client_id}")
        logger.info(f"  Intake URL: {intake_url or 'N/A'}")
        logger.info(f"  Fields sent: {len(intakeq_payload)}")
        logger.info("=" * 60)

        return jsonify({
            "client_id": client_id, 
            "intake_url": intake_url,
            "intakeq_response": result
        })

    except requests.Timeout as e:
        logger.error(f"❌ [INTAKEQ API TIMEOUT] {str(e)}")
        return jsonify({"error": "IntakeQ API request timed out"}), 504
    except requests.ConnectionError as e:
        logger.error(f"❌ [INTAKEQ CONNECTION ERROR] {str(e)}")
        return jsonify({"error": "Failed to connect to IntakeQ API"}), 502
    except requests.RequestException as e:
        logger.error(f"❌ [INTAKEQ API REQUEST ERROR] {str(e)}")
        return jsonify({"error": f"Network error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"❌ [INTAKEQ CLIENT CREATION ERROR] {str(e)}")
        return jsonify({"error": str(e)}), 500


def build_comprehensive_intakeq_payload(client_data: dict, payment_type: str) -> dict:
    """
    Build comprehensive IntakeQ payload from client data.
    Maps ALL available Sol Health client data to IntakeQ API format.
    """
    # Basic client information with enhanced fallbacks
    effective_first_name = (
        client_data.get("preferred_name") or 
        client_data.get("first_name") or ""
    )
    last_name = client_data.get("last_name") or ""
    
    # Build the enhanced base payload following IntakeQ API specification
    payload = {
        # Core identification
        "Name": f"{effective_first_name} {last_name}".strip(),
        "FirstName": effective_first_name,
        "LastName": last_name,
        "MiddleName": client_data.get("middle_name", ""),
        "Email": client_data.get("email", ""),
        
        # Contact information
        "Phone": client_data.get("phone", ""),
        "MobilePhone": client_data.get("mobile_phone") or client_data.get("phone", ""),
        "HomePhone": client_data.get("home_phone", ""),
        "WorkPhone": client_data.get("work_phone", ""),
        
        # Demographics
        "Gender": map_gender(client_data.get("gender", "")),
        "MaritalStatus": client_data.get("marital_status", ""),
        
        # Location
        "StateShort": client_data.get("state", ""),
        "City": client_data.get("city", ""),
        "StreetAddress": client_data.get("street_address", ""),
        "UnitNumber": client_data.get("unit_number", ""),
        "PostalCode": client_data.get("postal_code", ""),
        "Country": client_data.get("country", "USA"),
        
        # System fields
        "Archived": False,
        "DateCreated": int(time.time() * 1000),  # Unix timestamp in milliseconds
        "LastActivityDate": int(time.time() * 1000),
        "LastActivityName": "Client Added",
    }
    
    # Handle date of birth conversion
    if client_data.get("date_of_birth"):
        payload["DateOfBirth"] = convert_date_to_timestamp(client_data["date_of_birth"])
    elif client_data.get("insurance_date_of_birth"):
        payload["DateOfBirth"] = convert_date_to_timestamp(client_data["insurance_date_of_birth"])
    
    # Insurance information for insurance clients
    if payment_type == "insurance":
        add_comprehensive_insurance_fields(payload, client_data)
    
    # External ID mapping
    if client_data.get("response_id"):
        payload["ExternalClientId"] = client_data["response_id"]
    
    # Enhanced additional information compilation
    additional_info = build_comprehensive_additional_information(client_data, payment_type)
    if additional_info:
        payload["AdditionalInformation"] = additional_info
    
    # Comprehensive custom fields for Sol Health specific data
    payload["CustomFields"] = build_comprehensive_custom_fields(client_data, payment_type)
    
    return payload


def add_comprehensive_insurance_fields(payload: dict, client_data: dict) -> None:
    """Add comprehensive insurance-specific fields to the payload."""
    # Primary insurance fields
    if client_data.get("insurance_provider"):
        payload["PrimaryInsuranceCompany"] = client_data["insurance_provider"]
    
    if client_data.get("insurance_member_id"):
        payload["PrimaryInsurancePolicyNumber"] = client_data["insurance_member_id"]
    
    if client_data.get("insurance_group_number"):
        payload["PrimaryInsuranceGroupNumber"] = client_data["insurance_group_number"]
    
    if client_data.get("insurance_holder_name"):
        payload["PrimaryInsuranceHolderName"] = client_data["insurance_holder_name"]
    
    if client_data.get("insurance_relationship"):
        payload["PrimaryInsuranceRelationship"] = client_data["insurance_relationship"]
    
    if client_data.get("insurance_holder_dob"):
        payload["PrimaryInsuranceHolderDateOfBirth"] = convert_date_to_timestamp(
            client_data["insurance_holder_dob"]
        )
    
    # Additional insurance verification data from benefits
    if client_data.get("insurance_verification_data"):
        try:
            verification_data = json.loads(client_data["insurance_verification_data"]) if isinstance(client_data["insurance_verification_data"], str) else client_data["insurance_verification_data"]
            if verification_data and verification_data.get("subscriber"):
                subscriber = verification_data["subscriber"]
                if subscriber.get("firstName") and not payload.get("PrimaryInsuranceHolderName"):
                    payload["PrimaryInsuranceHolderName"] = f"{subscriber.get('firstName', '')} {subscriber.get('lastName', '')}".strip()
        except:
            pass


def build_comprehensive_additional_information(client_data: dict, payment_type: str) -> str:
    """Build comprehensive AdditionalInformation field with ALL available Sol Health data."""
    info_parts = []
    
    # Sol Health Response ID
    if client_data.get("response_id"):
        info_parts.append(f"Sol Health Response ID: {client_data['response_id']}")
    
    # Preferred name if different from first name
    if (client_data.get("preferred_name") and 
        client_data["preferred_name"] != client_data.get("first_name")):
        info_parts.append(f"Preferred Name: {client_data['preferred_name']}")
    
    # Mental health assessment scores (detailed breakdown)
    phq9_scores = client_data.get("phq9_scores", {})
    if phq9_scores and isinstance(phq9_scores, dict) and any(phq9_scores.values()):
        phq9_details = []
        for question, score in phq9_scores.items():
            if score:
                phq9_details.append(f"  {question.replace('_', ' ').title()}: {score}")
        if phq9_details:
            info_parts.append("PHQ-9 Depression Screening:\n" + "\n".join(phq9_details))
    
    gad7_scores = client_data.get("gad7_scores", {})
    if gad7_scores and isinstance(gad7_scores, dict) and any(gad7_scores.values()):
        gad7_details = []
        for question, score in gad7_scores.items():
            if score:
                gad7_details.append(f"  {question.replace('_', ' ').title()}: {score}")
        if gad7_details:
            info_parts.append("GAD-7 Anxiety Screening:\n" + "\n".join(gad7_details))
    
    # Legacy total scores (if available)
    phq9_total = client_data.get("phq9_total")
    gad7_total = client_data.get("gad7_total")
    if phq9_total is not None or gad7_total is not None:
        scores = []
        if phq9_total is not None:
            scores.append(f"PHQ-9 Total: {phq9_total}")
        if gad7_total is not None:
            scores.append(f"GAD-7 Total: {gad7_total}")
        info_parts.append(f"Assessment Total Scores - {', '.join(scores)}")
    
    # Substance use screening
    substance_info = []
    if client_data.get('alcohol_frequency'):
        substance_info.append(f"Alcohol use frequency: {client_data['alcohol_frequency']}")
    if client_data.get('recreational_drugs_frequency'):
        substance_info.append(f"Recreational drug use frequency: {client_data['recreational_drugs_frequency']}")
    if substance_info:
        info_parts.append("Substance Use Screening:\n  " + "\n  ".join(substance_info))
    
    # Comprehensive therapy preferences
    preferences = []
    if client_data.get("therapist_gender_preference"):
        preferences.append(f"Therapist Gender Preference: {client_data['therapist_gender_preference']}")
    
    # Handle both old and new field names for specializations
    specializations = (client_data.get("therapist_specialization") or 
                      client_data.get("therapist_specializes_in") or [])
    if specializations:
        if isinstance(specializations, list):
            preferences.append(f"Requested Specialties: {', '.join(specializations)}")
        else:
            preferences.append(f"Requested Specialties: {specializations}")
    
    lived_experiences = client_data.get("therapist_lived_experiences", [])
    if lived_experiences:
        if isinstance(lived_experiences, list):
            preferences.append(f"Therapist Lived Experiences Requested: {', '.join(lived_experiences)}")
        else:
            preferences.append(f"Therapist Lived Experiences Requested: {lived_experiences}")
    
    if preferences:
        info_parts.append("Therapist Preferences:\n  " + "\n  ".join(preferences))
    
    # What brings you to therapy
    if client_data.get("what_brings_you"):
        what_brings = client_data["what_brings_you"]
        if len(what_brings) > 200:
            what_brings = what_brings[:197] + "..."
        info_parts.append(f"What brings you to therapy: {what_brings}")
    
    # Demographics and background
    demographics = []
    if client_data.get("age"):
        demographics.append(f"Age: {client_data['age']}")
    
    race_ethnicity = client_data.get("race_ethnicity", [])
    if race_ethnicity:
        if isinstance(race_ethnicity, list):
            demographics.append(f"Race/Ethnicity: {', '.join(race_ethnicity)}")
        else:
            demographics.append(f"Race/Ethnicity: {race_ethnicity}")
    
    lived_experiences_general = client_data.get("lived_experiences", [])
    if lived_experiences_general:
        if isinstance(lived_experiences_general, list):
            demographics.append(f"Lived Experiences: {', '.join(lived_experiences_general)}")
        else:
            demographics.append(f"Lived Experiences: {lived_experiences_general}")
    
    if client_data.get("university"):
        demographics.append(f"University: {client_data['university']}")
    
    if demographics:
        info_parts.append("Demographics:\n  " + "\n  ".join(demographics))
    
    # Safety screening and matching preferences
    if client_data.get("safety_screening"):
        info_parts.append(f"Safety Screening: {client_data['safety_screening']}")
    
    if client_data.get("matching_preference"):
        info_parts.append(f"Matching Preference: {client_data['matching_preference']}")
    
    # Referral and tracking information
    tracking_info = []
    if client_data.get("referred_by"):
        tracking_info.append(f"Referred by: {client_data['referred_by']}")
    
    if client_data.get("promo_code"):
        tracking_info.append(f"Promo Code: {client_data['promo_code']}")
    
    # UTM tracking data
    utm_parts = []
    for utm_field in ["utm_source", "utm_medium", "utm_campaign"]:
        if client_data.get(utm_field):
            utm_parts.append(f"{utm_field}: {client_data[utm_field]}")
    if utm_parts:
        tracking_info.append(f"Marketing Attribution: {', '.join(utm_parts)}")
    
    # Timestamps
    if client_data.get("onboarding_completed_at"):
        tracking_info.append(f"Onboarding Completed: {client_data['onboarding_completed_at']}")
    if client_data.get("survey_completed_at"):
        tracking_info.append(f"Survey Completed: {client_data['survey_completed_at']}")
    
    if tracking_info:
        info_parts.append("Tracking Information:\n  " + "\n  ".join(tracking_info))
    
    return "\n\n".join(info_parts)


def build_comprehensive_custom_fields(client_data: dict, payment_type: str) -> list:
    """Build comprehensive CustomFields array for IntakeQ with all available data."""
    custom_fields = []
    
    # Payment type field (using field ID from your configuration)
    custom_fields.append({
        "FieldId": INTAKEQ_CUSTOM_FIELDS['insurance_type'],
        "Value": "Cash Pay" if payment_type == "cash_pay" else "Insurance",
    })
    
    # For insurance clients, add comprehensive insurance-specific custom fields
    if payment_type == "insurance":
        # Insurance benefit fields
        insurance_benefit_fields = {
            'copay': client_data.get('copay'),
            'deductible': client_data.get('deductible'),
            'coinsurance': client_data.get('coinsurance'),
            'out_of_pocket_max': client_data.get('out_of_pocket_max'),
            'remaining_deductible': client_data.get('remaining_deductible'),
            'remaining_oop_max': client_data.get('remaining_oop_max'),
            'member_obligation': client_data.get('member_obligation'),
            'benefit_structure': client_data.get('benefit_structure')
        }
        
        for field_name, value in insurance_benefit_fields.items():
            if value and field_name in INTAKEQ_CUSTOM_FIELDS:
                custom_fields.append({
                    "FieldId": INTAKEQ_CUSTOM_FIELDS[field_name],
                    "Value": str(value)
                })
        
        # Insurance verification status
        if client_data.get("insurance_verified") is not None:
            verification_status = "Verified" if client_data["insurance_verified"] else "Pending Verification"
            custom_fields.append({
                "FieldId": INTAKEQ_CUSTOM_FIELDS['coverage_status'],
                "Value": verification_status,
            })
        
        # Mental health coverage status
        custom_fields.append({
            "FieldId": INTAKEQ_CUSTOM_FIELDS['mental_health_coverage'],
            "Value": "Active" if client_data.get("insurance_verified") else "Pending",
        })
        
        # Plan status
        custom_fields.append({
            "FieldId": INTAKEQ_CUSTOM_FIELDS['plan_status'],
            "Value": "Active",
        })
    
    # Assessment totals as custom fields for easy access
    if client_data.get("phq9_total") is not None:
        custom_fields.append({
            "FieldId": "phq9_score",
            "Value": str(client_data["phq9_total"]),
        })
    
    if client_data.get("gad7_total") is not None:
        custom_fields.append({
            "FieldId": "gad7_score", 
            "Value": str(client_data["gad7_total"]),
        })
    
    # Emergency contact information (if available)
    if client_data.get("emergency_contact_name"):
        custom_fields.append({
            "FieldId": "EmergencyContactName",
            "Value": client_data["emergency_contact_name"],
        })
    
    if client_data.get("emergency_contact_phone"):
        custom_fields.append({
            "FieldId": "EmergencyContactPhone",
            "Value": client_data["emergency_contact_phone"],
        })
    
    if client_data.get("emergency_contact_relationship"):
        custom_fields.append({
            "FieldId": "EmergencyContactRelationship",
            "Value": client_data["emergency_contact_relationship"],
        })
    
    # Demographics as custom fields
    if client_data.get("age"):
        custom_fields.append({
            "FieldId": "client_age",
            "Value": str(client_data["age"]),
        })
    
    return custom_fields


def map_gender(gender_input: str) -> str:
    """Map client gender input to IntakeQ expected values."""
    if not gender_input:
        return ""
    
    gender_lower = gender_input.lower().strip()
    
    # Map common variations to standard values
    gender_mapping = {
        "m": "Male",
        "male": "Male",
        "man": "Male",
        "f": "Female", 
        "female": "Female",
        "woman": "Female",
        "nb": "Non-binary",
        "non-binary": "Non-binary",
        "nonbinary": "Non-binary",
        "other": "Other",
        "prefer not to say": "",
        "not specified": "",
    }
    
    return gender_mapping.get(gender_lower, gender_input.title())


def convert_date_to_timestamp(date_input) -> int:
    """Convert various date formats to Unix timestamp in milliseconds."""
    if isinstance(date_input, int):
        # Already a timestamp
        return date_input if date_input > 1000000000000 else date_input * 1000
    
    if isinstance(date_input, str):
        try:
            # Try parsing common date formats
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%fZ"]:
                try:
                    dt = datetime.strptime(date_input, fmt)
                    return int(dt.timestamp() * 1000)
                except ValueError:
                    continue
        except:
            pass
    
    return None


@intakeq_forms_bp.route("/intakeq/client", methods=["GET"])
def get_intakeq_client():
    """Retrieve client information from IntakeQ by email."""
    try:
        email = request.args.get("email", "").strip()
        payment_type = request.args.get("payment_type", "cash_pay").strip()

        if not email:
            return jsonify({"error": "email parameter is required"}), 400

        # Log the request
        logger.info(f"🔍 [INTAKEQ CLIENT LOOKUP] {email} ({payment_type})")

        # Determine which IntakeQ API key to use
        intakeq_api_key = (
            os.getenv("CASH_PAY_INTAKEQ_API_KEY")
            if payment_type == "cash_pay"
            else os.getenv("INSURANCE_INTAKEQ_API_KEY")
        )

        if not intakeq_api_key:
            error_msg = f"Missing IntakeQ API key for payment type: {payment_type}"
            logger.error(f"❌ {error_msg}")
            return jsonify({"error": error_msg}), 500

        # Call IntakeQ API
        params = urlencode({"email": email})
        intakeq_response = requests.get(
            f"https://intakeq.com/api/v1/clients?{params}",
            headers={
                "X-API-KEY": intakeq_api_key,  # Updated to correct header name
                "Content-Type": "application/json",
            },
            timeout=60,
        )

        logger.info(f"  📥 IntakeQ Response Status: {intakeq_response.status_code}")

        if not intakeq_response.ok:
            error_text = intakeq_response.text
            error_msg = (
                f"IntakeQ API error: {intakeq_response.status_code} - {error_text}"
            )
            logger.error(f"❌ {error_msg}")
            return jsonify({"error": error_msg}), 500

        result = intakeq_response.json()

        client_count = len(result) if isinstance(result, list) else (1 if result else 0)
        logger.info(f"  ✅ Found {client_count} client(s)")

        return jsonify(result)

    except requests.Timeout as e:
        logger.error(f"❌ [INTAKEQ API TIMEOUT] {str(e)}")
        return jsonify({"error": "IntakeQ API request timed out"}), 504
    except requests.ConnectionError as e:
        logger.error(f"❌ [INTAKEQ CONNECTION ERROR] {str(e)}")
        return jsonify({"error": "Failed to connect to IntakeQ API"}), 502
    except requests.RequestException as e:
        logger.error(f"❌ [INTAKEQ API REQUEST ERROR] {str(e)}")
        return jsonify({"error": f"Network error: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"❌ [INTAKEQ CLIENT LOOKUP ERROR] {str(e)}")
        return jsonify({"error": str(e)}), 500


@intakeq_forms_bp.route("/intakeq_forms/mandatory_form", methods=["POST"])
def send_mandatory_form():
    """Send mandatory form to client via IntakeQ"""
    data = request.get_json()

    required_fields = ["client_email", "client_name", "therapist_email"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    # Mock sending form (implement actual IntakeQ integration later)
    print(f"📧 Sending IntakeQ form to: {data['client_name']} ({data['client_email']})")
    print(f"👨‍⚕️ From therapist: {data['therapist_email']}")

    return jsonify(
        {
            "success": True,
            "message": "Mandatory form sent successfully",
            "form_id": f"form_{uuid.uuid4().hex[:8]}",
        }
    ) 