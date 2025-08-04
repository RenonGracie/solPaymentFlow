import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';

// Types for survey data
interface SurveyFormData {
  // Basic Info (from insurance modal)
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  memberId?: string;
  provider?: string;
  paymentType: 'insurance' | 'cash_pay';
  
  // Demographics
  phone: string;
  gender: string;
  age: string;
  state: string;
  
  // Therapy preferences
  therapist_specializes_in: string[];
  therapist_identifies_as: string;
  lived_experiences: string[];
  
  // Mental health screening (PHQ-9 style)
  alcohol: string;
  drugs: string;
  pleasure_doing_things: string;
  feeling_down: string;
  trouble_falling: string;
  feeling_tired: string;
  poor_appetite: string;
  feeling_bad_about_yourself: string;
  trouble_concentrating: string;
  moving_or_speaking_so_slowly: string;
  suicidal_thoughts: string;
  
  // Anxiety screening (GAD-7 style)
  feeling_nervous: string;
  not_control_worrying: string;
  worrying_too_much: string;
  trouble_relaxing: string;
  being_so_restless: string;
  easily_annoyed: string;
  feeling_afraid: string;
  
  // Additional info
  university?: string;
  what_brings_you: string;
  promo_code?: string;
  referred_by?: string;
  therapist_name?: string;
  
  // UTM tracking
  utm?: Record<string, unknown>;
}

interface SurveyStep {
  id: string;
  title: string;
  subtitle?: string;
  fields: SurveyField[];
}

interface SurveyField {
  name: keyof SurveyFormData;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'scale';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  validation?: (value: any) => string | null;
}

// Survey configuration
const surveySteps: SurveyStep[] = [
  {
    id: 'demographics',
    title: 'Tell us a bit about yourself',
    subtitle: 'This helps us match you with the right therapist',
    fields: [
      {
        name: 'phone',
        label: 'Phone Number',
        type: 'tel',
        required: true,
        placeholder: '(555) 123-4567',
        validation: (value) => {
          const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
          return phoneRegex.test(value) ? null : 'Please enter a valid phone number';
        }
      },
      {
        name: 'gender',
        label: 'Gender',
        type: 'select',
        required: true,
        options: [
          { value: 'female', label: 'Female' },
          { value: 'male', label: 'Male' },
          { value: 'non-binary', label: 'Non-binary' },
          { value: 'prefer-not-to-say', label: 'Prefer not to say' },
          { value: 'other', label: 'Other' }
        ]
      },
      {
        name: 'age',
        label: 'Age',
        type: 'text',
        required: true,
        placeholder: 'Enter your age',
        validation: (value) => {
          const age = parseInt(value);
          return age >= 18 && age <= 120 ? null : 'Please enter a valid age (18+)';
        }
      },
      {
        name: 'state',
        label: 'State',
        type: 'select',
        required: true,
        options: [
          { value: 'NY', label: 'New York' },
          { value: 'CA', label: 'California' },
          { value: 'TX', label: 'Texas' },
          { value: 'FL', label: 'Florida' },
          { value: 'PA', label: 'Pennsylvania' },
          { value: 'NJ', label: 'New Jersey' },
          // Add more states as needed
          { value: 'other', label: "I don't see my state" }
        ]
      }
    ]
  },
  {
    id: 'preferences',
    title: 'Your therapy preferences',
    subtitle: "Help us understand what you're looking for",
    fields: [
      {
        name: 'therapist_specializes_in',
        label: 'What areas would you like your therapist to specialize in?',
        type: 'checkbox',
        required: true,
        options: [
          { value: 'anxiety', label: 'Anxiety' },
          { value: 'depression', label: 'Depression' },
          { value: 'trauma', label: 'Trauma & PTSD' },
          { value: 'relationships', label: 'Relationships' },
          { value: 'stress', label: 'Stress Management' },
          { value: 'self-esteem', label: 'Self-Esteem' },
          { value: 'grief', label: 'Grief & Loss' },
          { value: 'addiction', label: 'Addiction' },
          { value: 'eating-disorders', label: 'Eating Disorders' },
          { value: 'lgbtq', label: 'LGBTQ+ Issues' }
        ]
      },
      {
        name: 'therapist_identifies_as',
        label: "Do you have a preference for your therapist's gender?",
        type: 'radio',
        required: true,
        options: [
          { value: 'female', label: 'Female' },
          { value: 'male', label: 'Male' },
          { value: 'non-binary', label: 'Non-binary' },
          { value: 'no-preference', label: 'No preference' }
        ]
      },
      {
        name: 'lived_experiences',
        label: "Are there any specific lived experiences you'd like your therapist to have?",
        type: 'checkbox',
        options: [
          { value: 'poc', label: 'Person of color' },
          { value: 'lgbtq', label: 'LGBTQ+' },
          { value: 'immigrant', label: 'Immigration experience' },
          { value: 'parent', label: 'Parenting' },
          { value: 'disability', label: 'Disability' },
          { value: 'veteran', label: 'Military/Veteran' },
          { value: 'none', label: 'No specific preference' }
        ]
      }
    ]
  },
  {
    id: 'mental-health-1',
    title: 'Mental health check-in',
    subtitle: 'Over the last 2 weeks, how often have you been bothered by any of the following?',
    fields: [
      {
        name: 'pleasure_doing_things',
        label: 'Little interest or pleasure in doing things',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      },
      {
        name: 'feeling_down',
        label: 'Feeling down, depressed, or hopeless',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      },
      {
        name: 'trouble_falling',
        label: 'Trouble falling or staying asleep, or sleeping too much',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      },
      {
        name: 'feeling_tired',
        label: 'Feeling tired or having little energy',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      }
    ]
  },
  {
    id: 'mental-health-2',
    title: 'Mental health check-in (continued)',
    subtitle: 'Over the last 2 weeks, how often have you been bothered by any of the following?',
    fields: [
      {
        name: 'poor_appetite',
        label: 'Poor appetite or overeating',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      },
      {
        name: 'feeling_bad_about_yourself',
        label: 'Feeling bad about yourself or that you are a failure',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      },
      {
        name: 'trouble_concentrating',
        label: 'Trouble concentrating on things',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      },
      {
        name: 'moving_or_speaking_so_slowly',
        label: 'Moving or speaking slowly, or being fidgety/restless',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      }
    ]
  },
  {
    id: 'safety-check',
    title: 'Your safety is important to us',
    fields: [
      {
        name: 'suicidal_thoughts',
        label: 'Have you had thoughts that you would be better off dead or of hurting yourself?',
        type: 'radio',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      }
    ]
  },
  {
    id: 'anxiety',
    title: 'Anxiety check-in',
    subtitle: 'Over the last 2 weeks, how often have you been bothered by the following?',
    fields: [
      {
        name: 'feeling_nervous',
        label: 'Feeling nervous, anxious, or on edge',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      },
      {
        name: 'not_control_worrying',
        label: 'Not being able to stop or control worrying',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      },
      {
        name: 'worrying_too_much',
        label: 'Worrying too much about different things',
        type: 'scale',
        required: true,
        options: [
          { value: '0', label: 'Not at all' },
          { value: '1', label: 'Several days' },
          { value: '2', label: 'More than half the days' },
          { value: '3', label: 'Nearly every day' }
        ]
      }
    ]
  },
  {
    id: 'substance-use',
    title: 'Substance use',
    subtitle: 'This helps us provide the most appropriate care',
    fields: [
      {
        name: 'alcohol',
        label: 'How often do you have a drink containing alcohol?',
        type: 'radio',
        required: true,
        options: [
          { value: 'never', label: 'Never' },
          { value: 'monthly', label: 'Monthly or less' },
          { value: '2-4-month', label: '2-4 times a month' },
          { value: '2-3-week', label: '2-3 times a week' },
          { value: '4-more-week', label: '4 or more times a week' }
        ]
      },
      {
        name: 'drugs',
        label: 'How often do you use drugs (not prescribed by a doctor)?',
        type: 'radio',
        required: true,
        options: [
          { value: 'never', label: 'Never' },
          { value: 'monthly', label: 'Monthly or less' },
          { value: '2-4-month', label: '2-4 times a month' },
          { value: '2-3-week', label: '2-3 times a week' },
          { value: '4-more-week', label: '4 or more times a week' }
        ]
      }
    ]
  },
  {
    id: 'final-thoughts',
    title: 'Almost done!',
    subtitle: 'Just a few more questions',
    fields: [
      {
        name: 'what_brings_you',
        label: 'What brings you to therapy at this time?',
        type: 'textarea',
        required: true,
        placeholder: "Share what you're hoping to work on in therapy..."
      },
      {
        name: 'university',
        label: 'University/College (if applicable)',
        type: 'text',
        placeholder: 'Enter your school name'
      },
      {
        name: 'promo_code',
        label: 'Promo code (if you have one)',
        type: 'text',
        placeholder: 'Enter promo code'
      },
      {
        name: 'referred_by',
        label: 'How did you hear about us?',
        type: 'select',
        options: [
          { value: 'google', label: 'Google search' },
          { value: 'friend', label: 'Friend or family' },
          { value: 'social-media', label: 'Social media' },
          { value: 'therapist', label: 'Another therapist' },
          { value: 'other', label: 'Other' }
        ]
      }
    ]
  }
];

// Phone number formatting helper
const formatPhoneNumber = (value: string) => {
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

// Survey Component
export default function TherapySurvey({ 
  initialData,
  onSubmit,
  onBack 
}: {
  initialData: Partial<SurveyFormData>;
  onSubmit: (data: SurveyFormData) => Promise<void>;
  onBack: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<SurveyFormData>>({
    ...initialData,
    therapist_specializes_in: [],
    lived_experiences: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSafetyAlert, setShowSafetyAlert] = useState(false);

  const currentStepData = surveySteps[currentStep];
  const progress = ((currentStep + 1) / surveySteps.length) * 100;

  // Handle field changes
  const handleFieldChange = (name: keyof SurveyFormData, value: any) => {
    if (name === 'phone') {
      value = formatPhoneNumber(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Check for safety concerns
    if (name === 'suicidal_thoughts' && value !== '0') {
      setShowSafetyAlert(true);
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (name: keyof SurveyFormData, value: string) => {
    setFormData(prev => {
      const currentValues = (prev[name] as string[]) || [];
      if (value === 'none') {
        return { ...prev, [name]: ['none'] };
      }
      
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues.filter(v => v !== 'none'), value];
      
      return { ...prev, [name]: newValues };
    });
  };

  // Validate current step
  const validateStep = () => {
    const stepErrors: Record<string, string> = {};
    
    currentStepData.fields.forEach(field => {
      const value = formData[field.name];
      
      if (field.required) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          stepErrors[field.name] = `${field.label} is required`;
        }
      }
      
      if (value && field.validation) {
        const error = field.validation(value);
        if (error) {
          stepErrors[field.name] = error;
        }
      }
    });
    
    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  // Handle next step
  const handleNext = async () => {
    if (!validateStep()) return;

    if (currentStep === surveySteps.length - 1) {
      // Submit the form
      setIsSubmitting(true);
      try {
        await onSubmit(formData as SurveyFormData);
      } catch (error) {
        console.error('Survey submission error:', error);
        alert('There was an error submitting your information. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep === 0) {
      onBack();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Render field based on type
  const renderField = (field: SurveyField) => {
    const value = formData[field.name];
    const error = errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div key={field.name} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select an option</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'radio':
      case 'scale':
        return (
          <div key={field.name} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className={`${field.type === 'scale' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2'}`}>
              {field.options?.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                    value === option.value
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="mr-3 text-yellow-500 focus:ring-yellow-400"
                  />
                  <span className="text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                    (value as string[])?.includes(option.value)
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={(value as string[])?.includes(option.value) || false}
                    onChange={() => handleCheckboxChange(field.name, option.value)}
                    className="mr-3 text-yellow-500 focus:ring-yellow-400"
                  />
                  <span className="text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-6">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Step {currentStep + 1} of {surveySteps.length}
          </p>
        </div>

        {/* Form content */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {currentStepData.title}
          </h2>
          {currentStepData.subtitle && (
            <p className="text-gray-600 mb-6">{currentStepData.subtitle}</p>
          )}

          {/* Render fields */}
          {currentStepData.fields.map(renderField)}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevious}
              className="flex items-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {currentStep === 0 ? 'Back' : 'Previous'}
            </button>

            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="flex items-center px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : currentStep === surveySteps.length - 1 ? (
                <>
                  Complete
                  <Check className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Safety alert modal */}
        {showSafetyAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-lg max-w-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                Your safety is our priority
              </h3>
              <p className="text-gray-600 mb-4">
                If you're having thoughts of self-harm, please reach out for immediate help:
              </p>
              <ul className="text-sm text-gray-700 mb-4 space-y-2">
                <li>• National Suicide Prevention Lifeline: 988</li>
                <li>• Crisis Text Line: Text HOME to 741741</li>
                <li>• Emergency Services: 911</li>
              </ul>
              <p className="text-gray-600 mb-4">
                Our therapists are here to support you. Would you like to continue with the questionnaire?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.href = 'tel:988'}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Call 988 Now
                </button>
                <button
                  onClick={() => setShowSafetyAlert(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}