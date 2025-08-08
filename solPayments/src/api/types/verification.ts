export interface VerificationBenefits {
    copay: string;
    coinsurance: string;
    memberObligation: string;
    deductible: string;
    remainingDeductible: string;
    oopMax: string;
    remainingOopMax: string;
    benefitStructure: string;
  }
  
  export interface VerificationData {
    benefits?: VerificationBenefits;
    subscriber?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      memberId?: string;
    };
    [key: string]: unknown;
  }
  
  export interface ClientData {
    id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    response_id?: string;
    [key: string]: unknown;
  }