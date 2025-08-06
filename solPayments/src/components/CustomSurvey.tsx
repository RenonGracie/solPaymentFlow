// solPayments/src/components/CustomSurvey.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface SurveyData {
  // Demographics
  first_name: string;
  last_name: string;
  email: string;
  preferred_name?: string; // Add this field
  phone?: string;
  age: string;
  gender: string;
  state: string; // This is US state, not status!
  
  // Preferences
  therapist_specializes_in: string[];
  therapist_identifies_as: string;
  
  // Mental Health Screening (PHQ-9)
  pleasure_doing_things: string;
  feeling_down: string;
  trouble_falling: string;
  feeling_tired: string;
  poor_appetite: string;
  feeling_bad_about_yourself: string;
  trouble_concentrating: string;
  moving_or_speaking_so_slowly: string;
  suicidal_thoughts: string;
  
  // Anxiety Screening (GAD-7)
  feeling_nervous: string;
  not_control_worrying: string;
  worrying_too_much: string;
  trouble_relaxing: string;
  being_so_restless: string;
  easily_annoyed: string;
  feeling_afraid: string;
  
  // Additional
  what_brings_you: string;
  lived_experiences: string[];
  university?: string;
  promo_code?: string;
  referred_by?: string;
}


interface CustomSurveyProps {
  paymentType: "insurance" | "cash_pay";
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    preferredName?: string;
    state?: string;
    provider?: string;
    paymentType?: string;
  };
  onSubmit: (surveyData: SurveyData) => void;
  onBack: () => void;
}

const SURVEY_STEPS = [
  'demographics',
  'preferences', 
  'mental_health',
  'anxiety',
  'additional'
] as const;

type SurveyStep = typeof SURVEY_STEPS[number];

export default function CustomSurvey({ paymentType, formData, onSubmit, onBack }: CustomSurveyProps) {
  const [currentStep, setCurrentStep] = useState<SurveyStep>('demographics');
  const [surveyData, setSurveyData] = useState<SurveyData>({
    // Pre-fill from form data
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email,
    preferred_name: formData.preferredName || formData.firstName, // Add preferred name with fallback
    phone: '',
    age: '',
    gender: '',
    state: formData.state || '', // Pre-fill state if passed from onboarding
    therapist_specializes_in: [],
    therapist_identifies_as: 'No preference',
    pleasure_doing_things: '',
    feeling_down: '',
    trouble_falling: '',
    feeling_tired: '',
    poor_appetite: '',
    feeling_bad_about_yourself: '',
    trouble_concentrating: '',
    moving_or_speaking_so_slowly: '',
    suicidal_thoughts: '',
    feeling_nervous: '',
    not_control_worrying: '',
    worrying_too_much: '',
    trouble_relaxing: '',
    being_so_restless: '',
    easily_annoyed: '',
    feeling_afraid: '',
    what_brings_you: '',
    lived_experiences: [],
    university: '',
    promo_code: '',
    referred_by: ''
  });

  const updateSurveyData = (field: keyof SurveyData, value: any) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  const currentStepIndex = SURVEY_STEPS.indexOf(currentStep);
  const totalSteps = SURVEY_STEPS.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < totalSteps) {
      setCurrentStep(SURVEY_STEPS[nextIndex]);
    } else {
      // Submit survey
      onSubmit(surveyData);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(SURVEY_STEPS[prevIndex]);
    } else {
      onBack();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'demographics':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Tell us about yourself</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Age Range*</label>
                <select
                  value={surveyData.age}
                  onChange={(e) => updateSurveyData('age', e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select age range</option>
                  <option value="18-24">18-24</option>
                  <option value="25-34">25-34</option>
                  <option value="35-44">35-44</option>
                  <option value="45-54">45-54</option>
                  <option value="55-64">55-64</option>
                  <option value="65+">65+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Gender*</label>
                <select
                  value={surveyData.gender}
                  onChange={(e) => updateSurveyData('gender', e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State*</label>
              {/* Show state if pre-filled from onboarding, otherwise show dropdown */}
              {surveyData.state && formData.state ? (
                <div className="w-full p-3 border rounded-lg bg-gray-50">
                  <span className="text-gray-700">{surveyData.state}</span>
                  <span className="text-sm text-gray-500 ml-2">(selected during signup)</span>
                </div>
              ) : (
                <select
                  value={surveyData.state}
                  onChange={(e) => updateSurveyData('state', e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select your state</option>
                  <option value="NY">New York</option>
                  <option value="NJ">New Jersey</option>
                  <option value="CA">California</option>
                  <option value="TX">Texas</option>
                  <option value="FL">Florida</option>
                  <option value="PA">Pennsylvania</option>
                  <option value="IL">Illinois</option>
                  <option value="OH">Ohio</option>
                  <option value="GA">Georgia</option>
                  <option value="NC">North Carolina</option>
                  <option value="MI">Michigan</option>
                  <option value="MA">Massachusetts</option>
                  <option value="VA">Virginia</option>
                  <option value="WA">Washington</option>
                  <option value="AZ">Arizona</option>
                  <option value="TN">Tennessee</option>
                  <option value="IN">Indiana</option>
                  <option value="MO">Missouri</option>
                  <option value="MD">Maryland</option>
                  <option value="WI">Wisconsin</option>
                  <option value="CO">Colorado</option>
                  <option value="MN">Minnesota</option>
                  <option value="SC">South Carolina</option>
                  <option value="AL">Alabama</option>
                  <option value="LA">Louisiana</option>
                  <option value="KY">Kentucky</option>
                  <option value="OR">Oregon</option>
                  <option value="OK">Oklahoma</option>
                  <option value="CT">Connecticut</option>
                  <option value="UT">Utah</option>
                  <option value="NV">Nevada</option>
                  <option value="NM">New Mexico</option>
                  <option value="WV">West Virginia</option>
                  <option value="NE">Nebraska</option>
                  <option value="ID">Idaho</option>
                  <option value="HI">Hawaii</option>
                  <option value="ME">Maine</option>
                  <option value="NH">New Hampshire</option>
                  <option value="RI">Rhode Island</option>
                  <option value="MT">Montana</option>
                  <option value="DE">Delaware</option>
                  <option value="SD">South Dakota</option>
                  <option value="ND">North Dakota</option>
                  <option value="AK">Alaska</option>
                  <option value="VT">Vermont</option>
                  <option value="WY">Wyoming</option>
                  <option value="DC">District of Columbia</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone (optional)</label>
              <input
                type="tel"
                value={surveyData.phone}
                onChange={(e) => updateSurveyData('phone', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Display preferred name if different from first name */}
            {surveyData.preferred_name && surveyData.preferred_name !== surveyData.first_name && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your therapist will address you as "{surveyData.preferred_name}"
                </p>
              </div>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Therapist Preferences</h2>
            
            <div>
              <label className="block text-sm font-medium mb-3">What areas would you like your therapist to specialize in?*</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'Anxiety', 'Depression', 'Trauma', 'Relationship challenges', 'Life transitions',
                  'LGBTQ+ identity', 'Eating disorders', 'ADHD', 'OCD', 'Bipolar Disorder',
                  'Substance use', 'Career stress', 'Family life', 'Building confidence',
                  'Stress and burnout', 'Body image', 'Panic attacks', 'Phobias'
                ].map((specialty) => (
                  <label key={specialty} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={surveyData.therapist_specializes_in.includes(specialty)}
                      onChange={(e) => {
                        const current = surveyData.therapist_specializes_in;
                        if (e.target.checked) {
                          updateSurveyData('therapist_specializes_in', [...current, specialty]);
                        } else {
                          updateSurveyData('therapist_specializes_in', current.filter(s => s !== specialty));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{specialty}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Do you have a preference for your therapist's gender identity?</label>
              <select
                value={surveyData.therapist_identifies_as}
                onChange={(e) => updateSurveyData('therapist_identifies_as', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="No preference">No preference</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>
          </div>
        );

      case 'mental_health':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Mental Health Assessment</h2>
            <p className="text-center text-gray-600 mb-6">
              Over the last 2 weeks, how often have you been bothered by any of the following problems?
            </p>
            
            {[
              { key: 'pleasure_doing_things', label: 'Little interest or pleasure in doing things' },
              { key: 'feeling_down', label: 'Feeling down, depressed, or hopeless' },
              { key: 'trouble_falling', label: 'Trouble falling or staying asleep, or sleeping too much' },
              { key: 'feeling_tired', label: 'Feeling tired or having little energy' },
              { key: 'poor_appetite', label: 'Poor appetite or overeating' },
              { key: 'feeling_bad_about_yourself', label: 'Feeling bad about yourself or that you are a failure' },
              { key: 'trouble_concentrating', label: 'Trouble concentrating on things' },
              { key: 'moving_or_speaking_so_slowly', label: 'Moving or speaking slowly, or being fidgety/restless' },
              { key: 'suicidal_thoughts', label: 'Thoughts that you would be better off dead' }
            ].map((item) => (
              <div key={item.key} className="space-y-2">
                <label className="block text-sm font-medium">{item.label}*</label>
                <div className="flex space-x-4">
                  {[
                    { value: 'Not at all', label: 'Not at all' },
                    { value: 'Several days', label: 'Several days' },
                    { value: 'More than half the days', label: 'More than half the days' },
                    { value: 'Nearly every day', label: 'Nearly every day' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name={item.key}
                        value={option.value}
                        checked={surveyData[item.key as keyof SurveyData] === option.value}
                        onChange={(e) => updateSurveyData(item.key as keyof SurveyData, e.target.value)}
                        required
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'anxiety':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Anxiety Assessment</h2>
            <p className="text-center text-gray-600 mb-6">
              Over the last 2 weeks, how often have you been bothered by the following problems?
            </p>
            
            {[
              { key: 'feeling_nervous', label: 'Feeling nervous, anxious, or on edge' },
              { key: 'not_control_worrying', label: 'Not being able to stop or control worrying' },
              { key: 'worrying_too_much', label: 'Worrying too much about different things' },
              { key: 'trouble_relaxing', label: 'Trouble relaxing' },
              { key: 'being_so_restless', label: 'Being so restless that it is hard to sit still' },
              { key: 'easily_annoyed', label: 'Becoming easily annoyed or irritable' },
              { key: 'feeling_afraid', label: 'Feeling afraid, as if something awful might happen' }
            ].map((item) => (
              <div key={item.key} className="space-y-2">
                <label className="block text-sm font-medium">{item.label}*</label>
                <div className="flex space-x-4">
                  {[
                    { value: 'Not at all', label: 'Not at all' },
                    { value: 'Several days', label: 'Several days' },
                    { value: 'More than half the days', label: 'More than half the days' },
                    { value: 'Nearly every day', label: 'Nearly every day' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name={item.key}
                        value={option.value}
                        checked={surveyData[item.key as keyof SurveyData] === option.value}
                        onChange={(e) => updateSurveyData(item.key as keyof SurveyData, e.target.value)}
                        required
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case 'additional':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-6">Additional Information</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">What brings you to therapy today?*</label>
              <textarea
                value={surveyData.what_brings_you}
                onChange={(e) => updateSurveyData('what_brings_you', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
                placeholder="Please share what's motivating you to seek therapy at this time..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Do any of these lived experiences apply to you? (Optional)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  'LGBTQ+ community member',
                  'First-generation college student', 
                  'Immigration background',
                  'Parent/caregiver',
                  'Career professional',
                  'Student',
                  'Religious/spiritual',
                  'Neurodivergent',
                  'Chronic illness/disability',
                  'Military/veteran'
                ].map((experience) => (
                  <label key={experience} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={surveyData.lived_experiences.includes(experience)}
                      onChange={(e) => {
                        const current = surveyData.lived_experiences;
                        if (e.target.checked) {
                          updateSurveyData('lived_experiences', [...current, experience]);
                        } else {
                          updateSurveyData('lived_experiences', current.filter(exp => exp !== experience));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{experience}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">University/School (Optional)</label>
              <input
                type="text"
                value={surveyData.university}
                onChange={(e) => updateSurveyData('university', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your university or school"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Promo Code (Optional)</label>
              <input
                type="text"
                value={surveyData.promo_code}
                onChange={(e) => updateSurveyData('promo_code', e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter promo code if you have one"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 'demographics':
        return surveyData.age && surveyData.gender && surveyData.state;
      case 'preferences':
        return surveyData.therapist_specializes_in.length > 0;
      case 'mental_health':
        return surveyData.pleasure_doing_things && surveyData.feeling_down && 
               surveyData.trouble_falling && surveyData.feeling_tired &&
               surveyData.poor_appetite && surveyData.feeling_bad_about_yourself &&
               surveyData.trouble_concentrating && surveyData.moving_or_speaking_so_slowly &&
               surveyData.suicidal_thoughts;
      case 'anxiety':
        return surveyData.feeling_nervous && surveyData.not_control_worrying &&
               surveyData.worrying_too_much && surveyData.trouble_relaxing &&
               surveyData.being_so_restless && surveyData.easily_annoyed &&
               surveyData.feeling_afraid;
      case 'additional':
        return surveyData.what_brings_you.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFFBF3' }}>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-2">
        <div 
          className="bg-blue-500 h-2 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">
              Step {currentStepIndex + 1} of {totalSteps}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
            
            <div className="flex justify-between mt-8">
              <Button
                onClick={goToPrevStep}
                variant="outline"
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {currentStepIndex === 0 ? 'Back to Payment' : 'Previous'}
              </Button>
              
              <Button
                onClick={goToNextStep}
                disabled={!isStepValid()}
                className="flex items-center"
              >
                {currentStepIndex === totalSteps - 1 ? 'Find My Therapist' : 'Continue'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}