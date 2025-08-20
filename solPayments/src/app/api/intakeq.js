/**
 * IntakeQ API functions for form management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Send mandatory IntakeQ form to client
 * @param {Object} formData - Form data for sending mandatory form
 * @param {string} formData.payment_type - Payment type: 'cash_pay' or 'insurance'
 * @param {string} [formData.client_id] - IntakeQ client ID (if available)
 * @param {string} [formData.client_name] - Client name (if client_id not available)
 * @param {string} [formData.client_email] - Client email (if client_id not available)
 * @param {string} [formData.client_phone] - Client phone (optional, for SMS)
 * @param {string} [formData.practitioner_id] - Practitioner/Therapist ID
 * @param {string} [formData.external_client_id] - External client ID for tracking
 * @returns {Promise<Object>} Response with intake URL and details
 */
export async function sendMandatoryForm(formData) {
  console.log('📤 Sending mandatory form request:', formData);
  
  try {
    const response = await fetch(`${API_BASE_URL}/intakeq_forms/mandatory_form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to send mandatory form:', result);
      throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Mandatory form sent successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error sending mandatory form:', error);
    throw error;
  }
}

/**
 * Create IntakeQ client and send mandatory form in one flow
 * This is a convenience function that combines client creation and form sending
 * @param {Object} clientData - Complete client data
 * @param {string} clientData.payment_type - Payment type: 'cash_pay' or 'insurance'
 * @param {string} clientData.first_name - Client first name
 * @param {string} clientData.last_name - Client last name
 * @param {string} clientData.email - Client email
 * @param {string} [clientData.phone] - Client phone
 * @param {string} [clientData.practitioner_id] - Practitioner/Therapist ID
 * @param {Object} [clientData.additional_data] - Additional client data for profile creation
 * @returns {Promise<Object>} Response with client_id, intake_url, and other details
 */
export async function createClientAndSendForm(clientData) {
  console.log('🚀 Creating client and sending mandatory form:', clientData);
  
  try {
    // Step 1: Create IntakeQ client first (using existing endpoint)
    const clientResponse = await fetch(`${API_BASE_URL}/intakeq/create-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_type: clientData.payment_type,
        first_name: clientData.first_name,
        last_name: clientData.last_name,
        email: clientData.email,
        phone: clientData.phone,
        ...clientData.additional_data
      })
    });

    if (!clientResponse.ok) {
      const clientError = await clientResponse.json();
      console.error('❌ Failed to create IntakeQ client:', clientError);
      throw new Error(`Client creation failed: ${clientError.error}`);
    }

    const clientResult = await clientResponse.json();
    console.log('✅ IntakeQ client created:', clientResult);

    // Step 2: Send mandatory form using the client_id
    const formResult = await sendMandatoryForm({
      payment_type: clientData.payment_type,
      client_id: clientResult.client_id,
      practitioner_id: clientData.practitioner_id,
      external_client_id: clientData.response_id || clientData.external_client_id
    });

    console.log('✅ Complete flow finished successfully');
    
    return {
      ...clientResult,
      mandatory_form: formResult,
      intake_url: formResult.intake_url,
      intake_id: formResult.intake_id
    };

  } catch (error) {
    console.error('❌ Error in createClientAndSendForm:', error);
    throw error;
  }
}

/**
 * Send mandatory form using client name/email (when client_id not available)
 * @param {Object} formData - Form data
 * @param {string} formData.payment_type - Payment type: 'cash_pay' or 'insurance' 
 * @param {string} formData.client_name - Full client name
 * @param {string} formData.client_email - Client email
 * @param {string} [formData.client_phone] - Client phone
 * @param {string} [formData.practitioner_id] - Practitioner/Therapist ID
 * @returns {Promise<Object>} Response with intake URL and details
 */
export async function sendMandatoryFormByName(formData) {
  return await sendMandatoryForm({
    payment_type: formData.payment_type,
    client_name: formData.client_name,
    client_email: formData.client_email,
    client_phone: formData.client_phone,
    practitioner_id: formData.practitioner_id,
    external_client_id: formData.external_client_id
  });
}