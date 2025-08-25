// // OnboardingFlow.tsx

// import { useState, useEffect } from "react";
// import { ChevronLeft, ChevronRight, X, Check, Loader2, ArrowRight } from "lucide-react";
// import { VIDEOS } from "@/lib/videos";
// import { Button } from "@/components/ui/button";
// import { checkEligibility } from "../app/api/eligibility.js";
// import { PAYER_ID_BY_PROVIDER, NPI, getSessionCostForPayer } from "@/api/eligibilityConfig";
// import { useInputFocus } from "@/hooks/useInputFocus";

// interface EligibilityBenefits {
//   copay: string;
//   coinsurance: string;
//   memberObligation: string;
//   deductible: string;
//   remainingDeductible: string;
//   oopMax: string;
//   remainingOopMax: string;
//   benefitStructure: string;
// }

// interface VerificationResponse {
//   benefits?: EligibilityBenefits;
//   subscriber?: {
//     firstName?: string;
//     lastName?: string;
//     dateOfBirth?: string;
//     memberId?: string;
//   };
//   [key: string]: unknown;
// }

// interface OnboardingFlowProps {
//   onComplete: (data: {
//     firstName: string;
//     lastName: string;
//     email: string;
//     preferredName?: string;
//     state?: string;
//     provider?: string;
//     memberId?: string;
//     dateOfBirth?: string;
//     paymentType?: string;
//     whatBringsYou?: string;
//     verificationData?: VerificationResponse;
//   }) => void;
//   onSelectPaymentType: (type: "insurance" | "cash_pay") => void;
//   initialStep?: number;
// }

// // Benefits display logic function (session rate can vary by payer)
// function getBenefitsDisplay(benefits: EligibilityBenefits, payerIdOverride?: string) {
//   // Parse numeric values from string amounts
//   const parseAmount = (amount: string): number => {
//     return parseFloat(amount.replace(/[$,]/g, '')) || 0;
//   };

//   const memberObligation = parseAmount(benefits.memberObligation);
//   const remainingDeductible = parseAmount(benefits.remainingDeductible);
//   const deductible = parseAmount(benefits.deductible);
//   const copay = parseAmount(benefits.copay);
//   const coinsurance = parseFloat(benefits.coinsurance.replace('%', '')) || 0;
//   const benefitStructure = benefits.benefitStructure || '';
  
//   // Session rate (allowed amount) varies by payer; default fallback=200
//   const sessionRate90791 = getSessionCostForPayer(payerIdOverride, 200);

//   // Determine if this is a range display (has coinsurance component)
//   const hasCoinsurance = benefitStructure.toLowerCase().includes('coinsurance') || 
//                          benefitStructure.toLowerCase().includes('co-insurance') ||
//                          coinsurance > 0;

//   // Calculate display amount
//   let displayAmount: string;
//   if (hasCoinsurance && memberObligation > 0) {
//     const lower = memberObligation;
//     const higher = Math.min(memberObligation + (sessionRate90791 - memberObligation), sessionRate90791);
//     displayAmount = `$${lower.toFixed(0)}-$${higher.toFixed(0)}`;
//   } else {
//     displayAmount = `$${memberObligation.toFixed(0)}`;
//   }

//   // Main display text
//   const largeText = hasCoinsurance && memberObligation > 0
//     ? `Based on your benefits, you can expect to pay ${displayAmount} for your sessions.`
//     : `Based on your benefits, you can expect to pay ${displayAmount} for your sessions.`;

//   const smallText = hasCoinsurance
//     ? "This is just an estimation based on the insurance information we received, including any remaining deductible or out-of-pocket maximum."
//     : "This is just an estimation based on the insurance information we received.";

//   // Additional details logic
//   let additionalDetails: string | null = null;

//   // Check for specific benefit structures requiring additional details
//   const isFullyCovered = benefitStructure.toLowerCase().includes('fully covered') || memberObligation === 0;
//   const hasAfterDeductible = benefitStructure.toLowerCase().includes('after deductible') || 
//                              benefitStructure.toLowerCase().includes('deductible');

//   if (isFullyCovered && !hasAfterDeductible) {
//     // Path 6: Fully covered
//     additionalDetails = "Great news—your sessions are fully covered by insurance. You won't owe anything.";
//   } else if (isFullyCovered && hasAfterDeductible) {
//     // Path 7: Fully covered after deductible
//     if (remainingDeductible > 0) {
//       additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} to go. After that, your sessions will be $0.\n\nNeed a lower rate? Talk to your therapist during the first session and we'll find a session rate that works for you.`;
//     } else {
//       additionalDetails = "Great news—you've already hit your deductible, so your sessions are fully covered by insurance. You won't owe anything.";
//     }
//   } else if (hasAfterDeductible && copay > 0 && !hasCoinsurance) {
//     // Path 8 & 9: Copay after deductible
//     if (remainingDeductible > 0) {
//       additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} to go. After that, your cost drops to just your copay ($${copay.toFixed(0)}) per session.\n\nNeed a lower rate? Talk to your therapist during the first session and we'll find a session rate that works for you.`;
//     } else {
//       additionalDetails = `You've already hit your deductible, so you'll pay your copay of $${copay.toFixed(0)} per session.`;
//     }
//   } else if (hasAfterDeductible && hasCoinsurance && copay === 0) {
//     // Path 10 & 11: Coinsurance after deductible
//     if (remainingDeductible > 0) {
//       additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} left to go. After that, you'll only pay ${coinsurance}% of each session cost.\n\nNeed a lower rate? Talk to your therapist during the first session and we'll find a session rate that works for you.`;
//     } else {
//       additionalDetails = "You've already hit your deductible, so you'll just pay your estimated coinsurance (your share of the session cost).";
//     }
//   } else if (hasAfterDeductible && hasCoinsurance && copay > 0) {
//     // Path 12: Copay and coinsurance after deductible
//     if (remainingDeductible > 0) {
//       additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} left to go. After that, you'll pay your estimated copay and coinsurance.\n\nNeed a lower rate? Talk to your therapist during the first session and we'll find a session rate that works for you.`;
//     } else {
//       additionalDetails = "You've already hit your deductible, so you'll pay your estimated copay and coinsurance (your share of the session cost).";
//     }
//   }

//   return {
//     largeText,
//     smallText,
//     additionalDetails
//   };
// }

// export default function OnboardingFlow({ 
//   onComplete, 
//   onSelectPaymentType,
//   initialStep = 0 
// }: OnboardingFlowProps) {
//   const [currentStep, setCurrentStep] = useState(initialStep);
//   const [formData, setFormData] = useState({
//     firstName: '',
//     lastName: '',
//     preferredName: '',
//     email: '',
//     state: '',
//     provider: '',
//     memberId: '',
//     dateOfBirth: '',
//     whatBringsYou: ''
//   });
//   const [showKeyboard, setShowKeyboard] = useState(false);
//   const [isPortrait, setIsPortrait] = useState(false);
//   const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
//   const [isWideScreen, setIsWideScreen] = useState(false);

//   // Input focus hooks for better mobile keyboard handling
//   const nameInputRef = useInputFocus({ scrollOffset: 100 });
//   const emailInputRef = useInputFocus({ scrollOffset: 100 });
//   const [screenReady, setScreenReady] = useState(false);
//   // Initial video loading state
//   const [initialVideoReady, setInitialVideoReady] = useState(false);

//   // Scroll to top on step changes to prevent inheriting previous viewport offset
//   useEffect(() => {
//     if (typeof window !== 'undefined' && typeof window.__appScrollToTop === 'function') {
//       window.__appScrollToTop(false);
//     }
//   }, [currentStep]);

//   // State selection variables
//   const [selectedState, setSelectedState] = useState('');
//   const [showOtherStateInput, setShowOtherStateInput] = useState(false);
//   const [otherStateSearch, setOtherStateSearch] = useState('');
//   const [showWaitlistPopup, setShowWaitlistPopup] = useState(false);
//   const [waitlistState, setWaitlistState] = useState('');
//   const [isOtherInputFocused, setIsOtherInputFocused] = useState(false);

//   // Insurance verification variables
//   const [selectedProvider, setSelectedProvider] = useState('');
//   const [isVerifying, setIsVerifying] = useState(false);
//   const [verificationResponse, setVerificationResponse] = useState<VerificationResponse | null>(null);
//   const [verificationStep, setVerificationStep] = useState<'form' | 'verifying' | 'success' | 'failed'>('form');
  
//   // NJ insurance plan verification
//   const [njInsurancePlan, setNjInsurancePlan] = useState<'yes' | 'no' | null>(null);

//   // Define featured states (supported states)
//   const featuredStates = ['NY', 'NJ', 'CA', 'TX', 'FL'];

//   // Insurance providers
//   const insuranceProviders = [
//     { id: "aetna", name: "Aetna" },
//     { id: "meritain", name: "Meritain Health" },
//     { id: "horizon_bcbs_nj", name: "Horizon Blue Cross Blue Shield of NJ" },
//     { id: "amerihealth", name: "AmeriHealth" }
//   ];

//   // Trading partner service ID mapping
//   const tradingPartnerServiceIdMap: Record<string, string> = PAYER_ID_BY_PROVIDER;

//   // All US states
//   const allStates = [
//     { code: 'AL', name: 'Alabama' },
//     { code: 'AK', name: 'Alaska' },
//     { code: 'AZ', name: 'Arizona' },
//     { code: 'AR', name: 'Arkansas' },
//     { code: 'CA', name: 'California' },
//     { code: 'CO', name: 'Colorado' },
//     { code: 'CT', name: 'Connecticut' },
//     { code: 'DE', name: 'Delaware' },
//     { code: 'FL', name: 'Florida' },
//     { code: 'GA', name: 'Georgia' },
//     { code: 'HI', name: 'Hawaii' },
//     { code: 'ID', name: 'Idaho' },
//     { code: 'IL', name: 'Illinois' },
//     { code: 'IN', name: 'Indiana' },
//     { code: 'IA', name: 'Iowa' },
//     { code: 'KS', name: 'Kansas' },
//     { code: 'KY', name: 'Kentucky' },
//     { code: 'LA', name: 'Louisiana' },
//     { code: 'ME', name: 'Maine' },
//     { code: 'MD', name: 'Maryland' },
//     { code: 'MA', name: 'Massachusetts' },
//     { code: 'MI', name: 'Michigan' },
//     { code: 'MN', name: 'Minnesota' },
//     { code: 'MS', name: 'Mississippi' },
//     { code: 'MO', name: 'Missouri' },
//     { code: 'MT', name: 'Montana' },
//     { code: 'NE', name: 'Nebraska' },
//     { code: 'NV', name: 'Nevada' },
//     { code: 'NH', name: 'New Hampshire' },
//     { code: 'NJ', name: 'New Jersey' },
//     { code: 'NM', name: 'New Mexico' },
//     { code: 'NY', name: 'New York' },
//     { code: 'NC', name: 'North Carolina' },
//     { code: 'ND', name: 'North Dakota' },
//     { code: 'OH', name: 'Ohio' },
//     { code: 'OK', name: 'Oklahoma' },
//     { code: 'OR', name: 'Oregon' },
//     { code: 'PA', name: 'Pennsylvania' },
//     { code: 'RI', name: 'Rhode Island' },
//     { code: 'SC', name: 'South Carolina' },
//     { code: 'SD', name: 'South Dakota' },
//     { code: 'TN', name: 'Tennessee' },
//     { code: 'TX', name: 'Texas' },
//     { code: 'UT', name: 'Utah' },
//     { code: 'VT', name: 'Vermont' },
//     { code: 'VA', name: 'Virginia' },
//     { code: 'WA', name: 'Washington' },
//     { code: 'WV', name: 'West Virginia' },
//     { code: 'WI', name: 'Wisconsin' },
//     { code: 'WY', name: 'Wyoming' }
//   ];

//   // Filter states based on search
//   const filteredStates = allStates.filter(state => 
//     state.name.toLowerCase().includes(otherStateSearch.toLowerCase()) && 
//     !featuredStates.includes(state.code)
//   );

//   // Detect viewport orientation and screen type
//   useEffect(() => {
//     const checkOrientation = () => {
//       if (typeof window === 'undefined') return;
      
//       const width = window.innerWidth;
//       const height = window.innerHeight;
//       const aspectRatio = height / width;
      
//       setIsPortrait(aspectRatio > 1);
//       setIsWideScreen(width > 1024); // Changed from 1400 to 1024 to match the logic
      
//       // Prefer width threshold for mobile to ensure vertical video on phones
//       if (width < 1200) {
//         setScreenType('mobile');
//       } else if (aspectRatio > 1) {
//         setScreenType('tablet');
//       } else {
//         setScreenType('desktop');
//       }
//       setScreenReady(true);
//     };

//     checkOrientation();
//     window.addEventListener('resize', checkOrientation);
//     return () => window.removeEventListener('resize', checkOrientation);
//   }, []);

//   const [expandedCard, setExpandedCard] = useState<'insurance' | 'cash_pay' | null>(null);

//   const handleContinue = () => {
//     if (currentStep === 0) {
//       setCurrentStep(1);
//     } else if (currentStep === 1 && formData.preferredName) {
//       setCurrentStep(2);
//     } else if (currentStep === 2 && formData.whatBringsYou) {
//       setCurrentStep(3);
//     } else if (currentStep === 3 && formData.email) {
//       setCurrentStep(4);
//     }
//   };

//   const handleBack = () => {
//     if (currentStep > 0) {
//       setCurrentStep(currentStep - 1);
//     }
//   };

//   const handleInputChange = (field: 'firstName' | 'lastName' | 'preferredName' | 'email' | 'provider' | 'memberId' | 'dateOfBirth' | 'whatBringsYou', value: string) => {
//     setFormData(prev => ({
//       ...prev,
//       [field]: value
//     }));
//   };

//   const handlePaymentSelection = (type: "insurance" | "cash_pay") => {
//     if (type === "cash_pay") {
//       setCurrentStep(5); // Go to state selection
//     } else {
//       setCurrentStep(6); // Go to NJ insurance plan verification first
//     }
//   };

//   const handleStateSelection = (stateCode: string) => {
//     setSelectedState(stateCode);
//     // Clear the other state input when selecting any state
//     setShowOtherStateInput(false);
//     setOtherStateSearch('');
//     setFormData(prev => ({ ...prev, state: stateCode }));
//   };

//   const handleStateConfirm = () => {
//     if (selectedState) {
//       if (!featuredStates.includes(selectedState)) {
//         // Show waitlist popup for unsupported states
//         setWaitlistState(allStates.find(s => s.code === selectedState)?.name || selectedState);
//         setShowWaitlistPopup(true);
//       } else {
//         // Proceed with supported state
//         // Ensure preferred name is capitalized
//         const capitalizedPreferredName = formData.preferredName 
//           ? formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase()
//           : '';

//         // For cash_pay at state selection, we only need email and preferred name
//         // firstName and lastName will be collected in the next step
//         if (!formData.email || !formData.preferredName) {
//           console.warn('Missing required fields for cash pay state selection:', {
//             email: !!formData.email,
//             preferredName: !!formData.preferredName
//           });
//           return; // Don't proceed without required fields
//         }

//         onComplete({
//           firstName: capitalizedPreferredName, // Use preferred name as firstName for now
//           lastName: '', // Will be collected in next step
//           email: formData.email,
//           preferredName: capitalizedPreferredName,
//           state: selectedState,
//           paymentType: 'cash_pay',
//           whatBringsYou: formData.whatBringsYou
//         });
//         onSelectPaymentType("cash_pay");
//       }
//     }
//   };

//   const handleInsuranceVerification = async () => {
//     // Validate required fields (email already collected in earlier step)
//     if (!selectedProvider || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId) {
//       return;
//     }

//     setVerificationStep('verifying');
//     setIsVerifying(true);

//     // Format date of birth for API (YYYYMMDD)
//     const formatDOB = (dobStr: string): string | null => {
//       const [year, month, day] = dobStr.split("-");
//       if (!year || !month || !day) return null;
//       return `${year}${month}${day}`;
//     };

//     const dobFormatted = formatDOB(formData.dateOfBirth);
    
//     if (!dobFormatted) {
//       setVerificationStep('failed');
//       setIsVerifying(false);
//       return;
//     }

//     // Prepare API payload
//     const payerId = tradingPartnerServiceIdMap[selectedProvider];
//     const sessionCostDollars = getSessionCostForPayer(payerId, 200);
//     const sessionCostCents = Math.round(sessionCostDollars * 100);
    
//     console.log('💰 OnboardingFlow Session Cost:', {
//       selectedProvider,
//       payerId,
//       sessionCostDollars,
//       sessionCostCents
//     });

//     const payload = {
//       controlNumber: "987654321",
//       tradingPartnerServiceId: payerId,
//       provider: {
//         organizationName: "Sol Health",
//         npi: NPI,
//         sessionCost: sessionCostCents
//       },
//       subscriber: {
//         firstName: formData.firstName,
//         lastName: formData.lastName,
//         dateOfBirth: dobFormatted,
//         memberId: formData.memberId
//       }
//     };

//     try {
//       const responseData = await checkEligibility(payload);
//       setVerificationResponse(responseData);
//       setVerificationStep('success');
      
//       // Update form data with verified information from response
//       if (responseData.subscriber) {
//         setFormData(prev => ({
//           ...prev,
//           firstName: responseData.subscriber?.firstName || prev.firstName,
//           lastName: responseData.subscriber?.lastName || prev.lastName,
//           dateOfBirth: responseData.subscriber?.dateOfBirth || prev.dateOfBirth,
//           memberId: responseData.subscriber?.memberId || prev.memberId
//         }));
//       }
//     } catch (error) {
//       console.error("Verification error:", error);
//       setVerificationStep('failed');
//     } finally {
//       setIsVerifying(false);
//     }
//   };

//   const handleInsuranceComplete = () => {
//     // Ensure preferred name is capitalized
//     const capitalizedPreferredName = formData.preferredName 
//       ? formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase()
//       : formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase();

//     // Complete the onboarding with verified insurance data
//     onComplete({
//       firstName: formData.firstName,
//       lastName: formData.lastName,
//       email: formData.email,
//       preferredName: capitalizedPreferredName,
//       state: 'NJ', // Default to NJ for insurance
//       provider: selectedProvider,
//       memberId: formData.memberId,
//       dateOfBirth: formData.dateOfBirth,
//       paymentType: 'insurance',
//       whatBringsYou: formData.whatBringsYou,
//       verificationData: verificationResponse || undefined // Include verification response
//     });
//     onSelectPaymentType("insurance");
//   };

//   // Preload all videos at runtime to reduce startup delay
//   useEffect(() => {
//     if (typeof window === 'undefined') return;

//     const warmVideos: HTMLVideoElement[] = [];
//     let cancelled = false;

//     // 1) Ensure local onboarding videos are requested first from the app directory
//     const localOnboardingSources = ['/onboarding-video-9x16.mp4', '/onboarding-video-16x9.mp4'];

//     const waitForLocalOnboarding = new Promise<void>((resolve) => {
//       let readyCount = 0;
//       const markReady = () => {
//         readyCount += 1;
//         if (readyCount >= localOnboardingSources.length) resolve();
//       };

//       localOnboardingSources.forEach((href) => {
//         const v = document.createElement('video');
//         v.src = href;
//         v.preload = 'auto';
//         v.muted = true;
//         v.setAttribute('playsinline', '');
//         v.oncanplaythrough = markReady;
//         v.onloadeddata = markReady;
//         try {
//           v.load();
//         } catch {}
//         warmVideos.push(v);
//       });

//       // Fallback in case events don't fire quickly
//       setTimeout(() => resolve(), 1500);
//     });

//     // 2) After local onboarding is warmed, warm remote videos sequentially to avoid contention
//     waitForLocalOnboarding.then(() => {
//       if (cancelled) return;

//       const urls = Object.entries(VIDEOS)
//         .map(([, href]) => href)
//         .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
//         // do not warm onboarding remotes to avoid duplicate downloads; local versions are preferred
//         .filter((u) => !/onboarding-video-(?:9x16|16x9)\.mp4$/i.test(u));

//       const loadSequential = (index: number) => {
//         if (cancelled || index >= urls.length) return;
//         const href = urls[index];
//         const v = document.createElement('video');
//         v.src = href;
//         v.preload = 'auto';
//         v.muted = true;
//         v.setAttribute('playsinline', '');
//         const next = () => loadSequential(index + 1);
//         v.oncanplaythrough = next;
//         v.onloadeddata = next;
//         try {
//           v.load();
//         } catch {}
//         warmVideos.push(v);
//       };

//       // start sequential warm
//       loadSequential(0);
//     });

//     return () => {
//       cancelled = true;
//       warmVideos.forEach((v) => {
//         try {
//           v.src = '';
//         } catch {}
//       });
//     };
//   }, []);

//   // Splash Screen with Video
//   if (currentStep === 0) {
//     if (!screenReady) {
//       return (
//         <div className="relative bg-black min-h-screen w-full overflow-hidden" />
//       );
//     }
//     // Mobile portrait layout - 9:16 video full screen
//     if (screenType === 'mobile') {
//       return (
//         <div className="relative bg-black h-[100dvh] w-full overscroll-none">
//           <video 
//             className="absolute inset-0 w-full h-full object-cover object-bottom"
//             autoPlay 
//             muted 
//             playsInline
//             loop={false}
//             controls={false}
//             preload="auto"
//             onCanPlayThrough={() => setInitialVideoReady(true)}
//             onEnded={handleContinue}
//           >
//             <source src="/onboarding-video-9x16.mp4" type="video/mp4" />
//             Your browser does not support the video tag.
//           </video>

//           {/* Bottom Continue button (match CustomSurvey) */}
//           <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex justify-center">
//             <Button
//               onClick={handleContinue}
//               className="py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-all min-w-[200px] max-w-[300px]"
//               style={{ fontFamily: 'var(--font-inter)' }}
//             >
//               Continue
//             </Button>
//           </div>

//           {!initialVideoReady && (
//             <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
//               <div className="flex items-center space-x-2 text-white">
//                 <Loader2 className="w-6 h-6 animate-spin" />
//                 <span className="text-sm">Loading…</span>
//               </div>
//             </div>
//           )}
//         </div>
//       );
//     }

//     // iPad/Tablet portrait - show only 16x9 video, auto-advance
//     if (screenType === 'tablet') {
//       return (
//         <div className="relative bg-black min-h-screen w-full overflow-hidden">
//           <video
//             className="absolute inset-0 w-full h-full object-contain bg-black"
//             autoPlay
//             muted
//             playsInline
//             loop={false}
//             controls={false}
//             preload="auto"
//             onEnded={handleContinue}
//           >
//             <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
//             Your browser does not support the video tag.
//           </video>

//           {/* Bottom Continue button (match CustomSurvey) */}
//           <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex justify-center">
//             <Button
//               onClick={handleContinue}
//               className="py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-all min-w-[200px] max-w-[300px]"
//               style={{ fontFamily: 'var(--font-inter)' }}
//             >
//               Continue
//             </Button>
//           </div>
//         </div>
//       );
//     }

//     // Desktop landscape (narrow) - full-screen 16x9 video, auto-advance
//     if (isWideScreen === false && screenType === 'desktop') {
//       return (
//         <div className="relative bg-black min-h-screen w-full overflow-hidden">
//           <video 
//             className="absolute inset-0 w-full h-full object-contain bg-black"
//             autoPlay 
//             muted 
//             playsInline
//             loop={false}
//             controls={false}
//             preload="auto"
//             onEnded={handleContinue}
//           >
//             <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
//             Your browser does not support the video tag.
//           </video>

//           {/* Bottom Continue button (match CustomSurvey) */}
//           <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex justify-center">
//             <Button
//               onClick={handleContinue}
//               className="py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-all min-w-[200px] max-w-[300px]"
//               style={{ fontFamily: 'var(--font-inter)' }}
//             >
//               Continue
//             </Button>
//           </div>
//         </div>
//       );
//     }

//     // Desktop landscape - wide screens: full-screen 16x9 video, auto-advance
//     return (
//       <div className="relative bg-black min-h-screen w-full overflow-hidden">
//         <video 
//           className="absolute inset-0 w-full h-full object-contain bg-black"
//           autoPlay 
//           muted 
//           playsInline
//           loop={false}
//           controls={false}
//           preload="auto"
//           onEnded={handleContinue}
//         >
//           <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
//           Your browser does not support the video tag.
//         </video>

//         {/* Bottom Continue button (match CustomSurvey) */}
//         <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex justify-center">
//           <Button
//             onClick={handleContinue}
//             className="py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-all min-w-[200px] max-w-[300px]"
//             style={{ fontFamily: 'var(--font-inter)' }}
//           >
//             Continue
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   // Name Input Screen - Only Preferred Name
//   if (currentStep === 1) {
//     return (
//       <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
//         {/* Header with sunset image - fixed height */}
//         <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
//           <img 
//             src="/onboarding-banner.jpg" 
//             alt="" 
//             className="w-full h-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
//           <div className="absolute inset-0 flex items-center justify-center">
//             <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
//                 style={{ 
//                   fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
//                   fontWeight: 400,
//                   letterSpacing: '0.02em',
//                   lineHeight: '1.1'
//                 }}>
//               CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
//             </p>
//           </div>
//         </div>

//         {/* Navigation - fixed height */}
//         <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
//           <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
//             <ChevronLeft className="w-6 h-6 text-gray-600" />
//           </button>
//           <div className="flex items-center">
//               <img
//               src="/sol-health-logo.svg"
//               alt="Sol Health"
//               className="h-5 w-auto"
//             />
//           </div>
//           <div className="w-10"></div>
//         </div>

//         {/* Content - truly centered with only preferred name */}
//         <div className="flex-1 flex items-center justify-center px-6 pb-16">
//           <div className="flow-narrow w-full -mt-16 mx-auto">
//             <div className="text-center mb-12">
//               <span className="text-5xl mb-6 block">👋</span>
//               <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800" 
//                   style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
//                 What can we call you?
//               </h1>
//             </div>

//             {/* Single Preferred Name Input */}
//             <div className="mb-8">
//               <input
//                 ref={nameInputRef}
//                 type="text"
//                 value={formData.preferredName}
//                 onChange={(e) => handleInputChange('preferredName', e.target.value)}
//                 onFocus={() => setShowKeyboard(true)}
//                 onBlur={() => setShowKeyboard(false)}
//                 placeholder=""
//                 className="w-full text-base sm:text-lg font-light border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-800 placeholder-gray-400 transition-colors duration-200 text-center"
//                 style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
//                 autoComplete="off"
//                 autoCorrect="off"
//                 autoCapitalize="words"
//                 inputMode="text"
//               />

//             </div>

//             <Button
//               onClick={handleContinue}
//               disabled={!formData.preferredName.trim()}
//               className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-colors duration-200 ${
//                 formData.preferredName.trim() 
//                   ? 'bg-yellow-100 text-gray-800 hover:bg-yellow-200' 
//                   : 'bg-gray-100 text-gray-400 cursor-not-allowed'
//               }`}
//               style={{ fontFamily: 'var(--font-inter)' }}
//             >
//               Continue
//               <ChevronRight className="inline w-5 h-5 ml-2" />
//             </Button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // What brings you here today? (New screen)
//   if (currentStep === 2) {
//     // What brings you here today? (New screen)
//     const options = [
//       {
//         title: "I'm navigating a life change",
//         desc: "Big or small, life shifts. Find your footing, your new life rhythm, and yourself amidst transition and uncertainty.",
//         color: '',
//         bgColor: '#e2ebff',
//         shadowColor: '#373842',
//         textColor: '#373842'
//       },
//       {
//         title: "I want help with something specific",
//         desc: "Anxiety, depression, trauma, relationships, and patterns that feel hard to change. Get personalized care.",
//         color: '',
//         bgColor: '#e6cab0',
//         shadowColor: '#5d3107',
//         textColor: '#5d3107'
//       },
//       {
//         title: "I'm feeling really overwhelmed",
//         desc: "Stress, burnout, auto-pilot, too much on your shoulders. Build coping tools and find space for you and what you truly want.",
//         color: '',
//         bgColor: '#fff8ca',
//         shadowColor: '#e6c9af',
//         textColor: '#8B4513'
//       },
//       {
//         title: "I'm not sure how to put it into words",
//         desc: "You just want to feel better. You're not alone—we'll explore together so you feel seen, heard, and moving forward.",
//         color: '',
//         bgColor: '#f9f9f9',
//         shadowColor: '#b2b2b4',
//         textColor: '#666666'
//       }
//     ];

//     return (
//       <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
//         <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
//           <img src="/onboarding-banner.jpg" alt="" className="w-full h-full object-cover" />
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
//           <div className="absolute inset-0 flex items-center justify-center">
//             <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
//                 style={{ 
//                   fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
//                   fontWeight: 400,
//                   letterSpacing: '0.02em',
//                   lineHeight: '1.1'
//                 }}>
//               WE'RE SO HAPPY<br/>YOU'RE HERE
//             </p>
//           </div>
//         </div>

//         <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
//           <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
//             <ChevronLeft className="w-6 h-6 text-gray-600" />
//           </button>
//           <div className="flex items-center">
//             <img src="/sol-health-logo.svg" alt="Sol Health" className="h-5 w-auto" />
//           </div>
//           <div className="w-10"></div>
//         </div>

//         <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-10">
//           <div className="w-full max-w-md mx-auto">
//             <div className="text-center mb-8">
//               <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
//                 What brings you here today?
//               </h1>
//             </div>
 
//             <div className="space-y-3 w-full flex flex-col items-center">
//               {options.map((opt) => (
//                 <button
//                   key={opt.title}
//                   onClick={() => {
//                     setFormData((prev) => ({ ...prev, whatBringsYou: opt.title }));
//                     setCurrentStep(3); // go straight to email step
//                   }}
//                   className={`relative w-80 max-w-full text-left ${opt.color} rounded-xl pt-1.5 pb-2.5 px-2.5 md:pt-2 md:pb-3 md:px-3.5 hover:brightness-95 transition-colors`}
//                   style={{ 
//                     fontFamily: 'var(--font-inter)',
//                     backgroundColor: opt.bgColor,
//                     boxShadow: `2px 2px 0 ${opt.shadowColor}`
//                   }}
//                 >
//                   <p className="very-vogue-title text-lg md:text-xl mb-0.5" style={{ color: opt.textColor }}>{opt.title}</p>
//                   <p className="text-[12px] md:text-[13px] leading-snug" style={{ color: opt.textColor }}>{opt.desc}</p>
//                   <ArrowRight className="absolute bottom-2.5 right-2.5 w-4 h-4 md:w-5 md:h-5" style={{ color: opt.textColor }} />
//                 </button>
//               ))}
//             </div>

//             <div className="pt-4 text-center">
//               <button
//                 type="button"
//                 onClick={() => {
//                   setFormData((prev) => ({ ...prev, whatBringsYou: 'Other' }));
//                   setCurrentStep(3); // go to email step
//                 }}
//                 className="text-sm md:text-base font-medium underline text-gray-700 hover:text-gray-900"
//                 style={{ fontFamily: 'var(--font-inter)' }}
//               >
//                 Other
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Email Input Screen (Step 3)
//   if (currentStep === 3) {
//     return (
//       <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
//         {/* Header with sunset image */}
//         <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
//           <img 
//             src="/onboarding-banner.jpg" 
//             alt="" 
//             className="w-full h-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
//           <div className="absolute inset-0 flex items-center justify-center">
//             <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
//                 style={{ 
//                   fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
//                   fontWeight: 400,
//                   letterSpacing: '0.02em',
//                   lineHeight: '1.1'
//                 }}>
//               CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
//             </p>
//           </div>
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
//           <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
//             <ChevronLeft className="w-6 h-6 text-gray-600" />
//           </button>
//           <div className="flex items-center">
//             <img
//               src="/sol-health-logo.svg"
//               alt="Sol Health"
//               className="h-5 w-auto"
//             />
//           </div>
//           <div className="w-10"></div>
//         </div>

//         {/* Content - Email Input */}
//         <div className="flex-1 flex items-center justify-center px-6 pb-16">
//           <div className="flow-narrow w-full -mt-16 mx-auto">
//             <div className="text-center mb-12">
//               <span className="text-5xl mb-6 block">📧</span>
//               <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800" 
//                   style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
//                 What's Your Email?
//               </h1>
//             </div>

//             {/* Email Input */}
//             <div className="mb-8">
//               <input
//                 ref={emailInputRef}
//                 type="email"
//                 value={formData.email}
//                 onChange={(e) => handleInputChange('email', e.target.value)}
//                 onFocus={() => setShowKeyboard(true)}
//                 onBlur={() => setShowKeyboard(false)}
//                 placeholder="well@being.com"
//                 className="w-full text-base sm:text-lg font-light border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-800 placeholder-gray-400 transition-colors duration-200 text-center"
//                 style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
//                 autoComplete="email"
//                 autoCorrect="off"
//                 autoCapitalize="off"
//                 inputMode="email"
//               />
//             </div>

//             <Button
//               onClick={handleContinue}
//               disabled={!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)}
//               className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-colors duration-200 ${
//                 formData.email.trim() && /\S+@\S+\.\S+/.test(formData.email)
//                   ? 'bg-yellow-100 text-gray-800 hover:bg-yellow-200' 
//                   : 'bg-gray-100 text-gray-400 cursor-not-allowed'
//               }`}
//               style={{ fontFamily: 'var(--font-inter)' }}
//             >
//               Continue
//               <ChevronRight className="inline w-5 h-5 ml-2" />
//             </Button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Payment Selection Screen (Step 4)
//   if (currentStep === 4) {
//     // Capitalize first letter of name
//     const displayName = formData.preferredName 
//       ? formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase()
//       : formData.firstName 
//         ? formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase()
//         : 'there';

//     return (
//       <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
//         {/* Header - fixed height */}
//         <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
//           <img 
//             src="/onboarding-banner.jpg" 
//             alt="" 
//             className="w-full h-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
//           <div className="absolute inset-0 flex items-center justify-center">
//             <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
//                 style={{ 
//                   fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
//                   fontWeight: 400,
//                   letterSpacing: '0.02em',
//                   lineHeight: '1.1'
//                 }}>
//               CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
//             </p>
//           </div>
//         </div>

//         {/* Navigation - fixed height */}
//         <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
//           <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
//             <ChevronLeft className="w-6 h-6 text-gray-600" />
//           </button>
//           <div 
//             className={`flex items-center transition-all duration-1000 ease-in-out ${
//               expandedCard ? 'transform -translate-y-8 scale-0 opacity-0' : ''
//             }`}
//           >
//             <h2 className="text-lg md:text-xl lg:text-2xl" style={{ fontFamily: 'var(--font-inter)' }}>
//               Sol Health
//             </h2>
//             <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
//           </div>
//           <div className="w-10"></div>
//         </div>

//         {/* Content - truly centered in remaining space */}
//         <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-12">
//           <div className="flow-narrow w-full -mt-12 mx-auto">
//             <div className="text-center mb-6 md:mb-8">
//               <span className="text-3xl md:text-5xl mb-3 md:mb-4 block">🎉</span>
//               <h1 className="text-2xl sm:text-3xl md:text-4xl mb-3 md:mb-4 text-gray-800" 
//                   style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
//                 Welcome {displayName}
//               </h1>
//               <p className="text-gray-600 text-sm md:text-base px-2" style={{ fontFamily: 'var(--font-inter)' }}>
//                 Learn about our accessible offerings and choose what's most relevant for you.
//               </p>
//             </div>

//             {/* Option Cards */}
//             <div className="space-y-3 md:space-y-4">
//               {/* Insurance Card */}
//               <div className="w-full overflow-hidden">
//                 <button
//                   onClick={() => {
//                     if (expandedCard === 'insurance') {
//                       setExpandedCard(null);
//                     } else {
//                       setExpandedCard('insurance');
//                     }
//                   }}
//                   className={`w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors duration-700 ease-in-out ${
//                     expandedCard === 'insurance' 
//                       ? 'rounded-t-2xl border-b-0' 
//                       : 'rounded-2xl'
//                   }`}
//                   style={{
//                     padding: expandedCard === 'insurance' ? '16px 20px 12px 20px' : '16px 20px'
//                   }}
//                 >
//                   <div className="flex justify-between items-start mb-2">
//                     <h3 className="text-base md:text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
//                       Use My Insurance (NJ Only)
//                     </h3>
//                     <span className="text-xs md:text-sm text-gray-600 font-medium flex items-center transition-transform" 
//                           style={{ fontFamily: 'var(--font-inter)' }}>
//                       {expandedCard === 'insurance' ? 'Show Less' : 'Learn More'}
//                       <ChevronRight className={`inline w-3 md:w-4 h-3 md:h-4 ml-1 transition-transform duration-300 ${expandedCard === 'insurance' ? 'rotate-90' : ''}`} />
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <p className="text-gray-600 text-xs md:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
//                       Associate Therapists
//                     </p>
//                     <span className="inline-block rounded-full bg-blue-100 text-gray-800 px-2 py-0.5 text-[11px] md:text-xs font-medium">
//                       ~$20-40 average session cost
//                     </span>
//                   </div>
//                 </button>
                
//                 {/* Expanded Insurance Content */}
//                 <div className={`bg-white border-l border-r border-b border-blue-200 rounded-b-2xl transition-all duration-700 ease-in-out overflow-hidden ${
//                   expandedCard === 'insurance' 
//                     ? 'max-h-[1000px] opacity-100' 
//                     : 'max-h-0 opacity-0'
//                 }`}>
//                   <div className="p-5 space-y-4 pb-6">
                     
//                      <div>
//                        <p className="text-sm font-medium text-gray-800 mb-2">We currently accept:</p>
//                        <p className="text-sm text-gray-600">Aetna, Amerihealth, Horizon Blue Cross Blue Shield, Meritain Health</p>
//                      </div>
                     
//                      <div>
//                        <p className="text-sm font-medium text-gray-800 mb-2">What to expect:</p>
//                        <ul className="text-sm text-gray-600 space-y-1">
//                          <li>• 1-1 virtual sessions (55 min)</li>
//                          <li>• We'll automatically verify your benefits and estimate what you'll pay</li>
//                          <li>• You'll be matched with an Associate Therapist. Associate Therapists have graduated from their counseling programs, have a provisional license, and are working towards full licensure.</li>
//                        </ul>
//                      </div>
                     
//                      <Button
//                        onClick={() => handlePaymentSelection("insurance")}
//                        className="w-full bg-blue-200 hover:bg-blue-300 text-gray-800 py-3"
//                      >
//                        Select Insurance Option
//                      </Button>
//                    </div>
//                  </div>
//                </div>

//               {/* Cash Pay Card */}
//               <div className="w-full overflow-hidden">
//                 <button
//                   onClick={() => {
//                     if (expandedCard === 'cash_pay') {
//                       setExpandedCard(null);
//                     } else {
//                       setExpandedCard('cash_pay');
//                     }
//                   }}
//                   className={`w-full text-left bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors duration-700 ease-in-out ${
//                     expandedCard === 'cash_pay' 
//                       ? 'rounded-t-2xl border-b-0' 
//                       : 'rounded-2xl'
//                   }`}
//                   style={{
//                     padding: expandedCard === 'cash_pay' ? '16px 20px 12px 20px' : '16px 20px'
//                   }}
//                 >
//                   <div className="flex justify-between items-start mb-2">
//                     <h3 className="text-base md:text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
//                       Pay Out-of-Pocket
//                     </h3>
//                     <span className="text-xs md:text-sm text-gray-600 font-medium flex items-center transition-transform" 
//                           style={{ fontFamily: 'var(--font-inter)' }}>
//                       {expandedCard === 'cash_pay' ? 'Show Less' : 'Learn More'}
//                       <ChevronRight className={`inline w-3 md:w-4 h-3 md:h-4 ml-1 transition-transform duration-300 ${expandedCard === 'cash_pay' ? 'rotate-90' : ''}`} />
//                     </span>
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <p className="text-gray-600 text-xs md:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
//                       Graduate Therapists
//                     </p>
//                     <span className="inline-block rounded-full bg-yellow-100 text-gray-800 px-2 py-0.5 text-[11px] md:text-xs font-medium">
//                       $30 per session
//                     </span>
//                   </div>
//                 </button>
                
//                 {/* Expanded Cash Pay Content */}
//                 <div className={`bg-white border-l border-r border-b border-yellow-200 rounded-b-2xl transition-all duration-700 ease-in-out overflow-hidden ${
//                   expandedCard === 'cash_pay' 
//                     ? 'max-h-[1000px] opacity-100' 
//                     : 'max-h-0 opacity-0'
//                 }`}>
//                   <div className="p-5 space-y-4 pb-6">
                     
//                      <div>
//                        <p className="text-sm font-medium text-gray-800 mb-2">States we currently serve:</p>
//                        <p className="text-sm text-gray-600">
//                          {featuredStates.map(stateCode => {
//                            const state = allStates.find(s => s.code === stateCode);
//                            return state?.name;
//                          }).join(', ')}
//                        </p>
//                      </div>
                     
//                      <div>
//                        <p className="text-sm font-medium text-gray-800 mb-2">What to expect:</p>
//                        <ul className="text-sm text-gray-600 space-y-1">
//                          <li>• 1-1 virtual sessions (45 min)</li>
//                          <li>• You pay $30 per session—no hidden fees.</li>
//                          <li>• You'll be matched with a Graduate Therapist. Graduate Therapists are in their counseling programs obtaining clinical hours under licensed supervision.</li>
//                        </ul>
//                      </div>
                     
//                      <Button
//                        onClick={() => handlePaymentSelection("cash_pay")}
//                        className="w-full bg-yellow-300 hover:bg-yellow-400 text-gray-800 py-3"
//                      >
//                        Select Cash Pay Option
//                      </Button>
//                    </div>
//                  </div>
//                </div>
//              </div>
//            </div>
//          </div>
//        </div>
//      );
//   }

//   // State Selection Screen (Step 4)
//   if (currentStep === 5) {
//     return (
//       <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
//         {/* Header with image */}
//         <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
//           <img 
//             src="/onboarding-banner.jpg" 
//             alt="" 
//             className="w-full h-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
//           <div className="absolute inset-0 flex items-center justify-center">
//             <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
//                 style={{ 
//                   fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
//                   fontWeight: 400,
//                   letterSpacing: '0.02em',
//                   lineHeight: '1.1'
//                 }}>
//               CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
//             </p>
//           </div>
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
//           <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
//             <ChevronLeft className="w-6 h-6 text-gray-600" />
//           </button>
//           <div className="flex items-center">
//             <img
//               src="/sol-health-logo.svg"
//               alt="Sol Health"
//               className="h-5 w-auto"
//             />
//           </div>
//           <div className="w-10"></div>
//         </div>

//         {/* Content */}
//         <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-12">
//           <div className="flow-narrow w-full mx-auto">
//             <div className="text-center mb-6">
//               <h1 className="text-xl sm:text-2xl md:text-3xl mb-3 text-gray-800" 
//                   style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
//                 What State Are You In?
//               </h1>
//             </div>

//             {/* Featured States */}
//             <div className="space-y-3 mb-6">
//               {featuredStates.map((stateCode) => {
//                 const stateName = allStates.find(s => s.code === stateCode)?.name || stateCode;
//                 return (
//                   <button
//                     key={stateCode}
//                     onClick={() => handleStateSelection(stateCode)}
//                     className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
//                       selectedState === stateCode
//                         ? 'border-[#5C3106] text-white shadow-lg' 
//                         : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
//                     }`}
//                     style={{
//                       backgroundColor: selectedState === stateCode ? '#5C3106' : 'white'
//                     }}
//                   >
//                     <div className={`w-8 h-8 flex items-center justify-center ${selectedState === stateCode ? '' : 'opacity-60'}`}>
//                       <img 
//                         src={`/state-icons/${stateCode.toLowerCase()}.svg`}
//                         alt={stateName}
//                         className="w-6 h-6"
//                         style={{
//                           filter: selectedState === stateCode ? 'brightness(0) invert(1)' : 'none'
//                         }}
//                         onError={(e) => {
//                           e.currentTarget.src = '/state-icons/default.svg';
//                         }}
//                       />
//                     </div>
                    
//                     <span className={`text-base font-medium flex-1 text-center ${selectedState === stateCode ? 'text-white' : 'text-gray-800'}`}>
//                       {stateName}
//                     </span>
                    
//                     <div className="w-8 h-8 flex items-center justify-center">
//                       {selectedState === stateCode && (
//                         <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
//                           <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
//                         </div>
//                       )}
//                     </div>
//                   </button>
//                 );
//               })}

//               {/* Other State Option */}
//               <button
//                 onClick={() => setShowOtherStateInput(!showOtherStateInput)}
//                 className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
//                   showOtherStateInput
//                     ? 'border-[#5C3106] bg-[#5C3106] text-white shadow-lg' 
//                     : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
//                 }`}
//               >
//                 <div className="w-8 h-8"></div>
                
//                 <span className={`text-base font-medium flex-1 text-center ${showOtherStateInput ? 'text-white' : 'text-gray-800'}`}>
//                   Other State
//                 </span>
                
//                 <div className="w-8 h-8 flex items-center justify-center">
//                   {showOtherStateInput && (
//                     <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
//                       <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
//                     </div>
//                   )}
//                 </div>
//               </button>
//             </div>

//             {/* Other State Input */}
//             {showOtherStateInput && (
//               <div className="mb-6 space-y-3 border-2 border-dashed border-gray-300 rounded-lg p-4">
//                 <input
//                   type="text"
//                   value={otherStateSearch}
//                   onChange={(e) => setOtherStateSearch(e.target.value)}
//                   onFocus={() => setIsOtherInputFocused(true)}
//                   onBlur={() => setIsOtherInputFocused(false)}
//                   placeholder="Start typing your state..."
//                   className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center"
//                   style={{ fontFamily: 'var(--font-inter)' }}
//                 />
                
//                 {otherStateSearch && filteredStates.length > 0 && (
//                   <div className="max-h-32 overflow-y-auto space-y-1">
//                     {filteredStates.slice(0, 5).map((state) => (
//                       <button
//                         key={state.code}
//                         onClick={() => handleStateSelection(state.code)}
//                         className={`w-full text-left p-2 rounded hover:bg-gray-100 text-sm ${
//                           selectedState === state.code ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
//                         }`}
//                       >
//                         {state.name}
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Continue Button */}
//             {selectedState && (
//               <Button
//                 onClick={handleStateConfirm}
//                 className="w-full py-3 px-6 rounded-full text-base font-medium transition-colors duration-200 bg-blue-100 text-gray-800 hover:bg-blue-200"
//                 style={{ fontFamily: 'var(--font-inter)' }}
//               >
//                 Continue
//                 <ChevronRight className="inline w-4 h-4 ml-2" />
//               </Button>
//             )}
//           </div>
//         </div>

//         {/* Waitlist Popup */}
//         {showWaitlistPopup && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//             <div className="bg-white rounded-lg p-6 max-w-md w-full">
//               <div className="text-center">
//                 <h3 className="text-xl font-bold mb-4">We're expanding to {waitlistState}!</h3>
//                 <p className="text-gray-600 mb-6">
//                   We're not yet available in {waitlistState}, but we're expanding quickly. 
//                   Join our waitlist to be notified when we launch in your state.
//                 </p>
//                 <div className="flex space-x-3">
//                   <Button
//                     onClick={() => setShowWaitlistPopup(false)}
//                     variant="outline"
//                     className="flex-1"
//                   >
//                     Close
//                   </Button>
//                   <Button
//                     onClick={() => {
//                       // Handle waitlist signup
//                       window.open('https://solhealth.co/waitlist', '_blank');
//                       setShowWaitlistPopup(false);
//                     }}
//                     className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
//                   >
//                     Join Waitlist
//                   </Button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   }

//   // NJ Insurance Plan Verification Screen (Step 6)
//   if (currentStep === 6) {
//     return (
//       <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
//         {/* Header with image */}
//         <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
//           <img 
//             src="/onboarding-banner.jpg" 
//             alt="" 
//             className="w-full h-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
//           <div className="absolute inset-0 flex items-center justify-center">
//             <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
//                 style={{ 
//                   fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
//                   fontWeight: 400,
//                   letterSpacing: '0.02em',
//                   lineHeight: '1.1'
//                 }}>
//               CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
//             </p>
//           </div>
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
//           <button onClick={() => setCurrentStep(5)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
//             <ChevronLeft className="w-6 h-6 text-gray-600" />
//           </button>
//           <div className="flex items-center">
//           <img
//               src="/sol-health-logo.svg"
//               alt="Sol Health"
//               className="h-5 w-auto"
//             />
//           </div>
//           <div className="w-10"></div>
//         </div>

//         {/* Content */}
//         <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-12">
//           <div className="flow-narrow w-full -mt-12 mx-auto">
//             <div className="text-center mb-6">
//               <h1 className="text-xl sm:text-2xl md:text-3xl mb-3 text-gray-800" 
//                   style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
//                 Is Your Health Plan From New Jersey?
//               </h1>
//             </div>

//             {/* State Options */}
//             <div className="space-y-3 mb-6">
//               {/* Yes, NJ Plan */}
//               <button
//                 onClick={() => setNjInsurancePlan('yes')}
//                 className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
//                   njInsurancePlan === 'yes'
//                     ? 'border-[#5C3106] text-white shadow-lg' 
//                     : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
//                 }`}
//                 style={{
//                   backgroundColor: njInsurancePlan === 'yes' ? '#5C3106' : 'white'
//                 }}
//               >
//                 <div className={`w-8 h-8 flex items-center justify-center ${njInsurancePlan === 'yes' ? '' : 'opacity-60'}`}>
//                   <img 
//                     src="/state-icons/nj.svg"
//                     alt="New Jersey"
//                     className="w-6 h-6"
//                     style={{
//                       filter: njInsurancePlan === 'yes' ? 'brightness(0) invert(1)' : 'none'
//                     }}
//                   />
//                 </div>
                
//                 <span className={`text-base font-medium flex-1 text-center ${njInsurancePlan === 'yes' ? 'text-white' : 'text-gray-800'}`}>
//                   Yes, I have a New Jersey plan
//                 </span>
                
//                 <div className="w-8 h-8 flex items-center justify-center">
//                   {njInsurancePlan === 'yes' && (
//                     <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
//                       <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
//                     </div>
//                   )}
//                 </div>
//               </button>

//               {/* No, Different State */}
//               <button
//                 onClick={() => setNjInsurancePlan('no')}
//                 className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
//                   njInsurancePlan === 'no'
//                     ? 'border-[#5C3106] text-white shadow-lg' 
//                     : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
//                 }`}
//                 style={{
//                   backgroundColor: njInsurancePlan === 'no' ? '#5C3106' : 'white'
//                 }}
//               >
//                 <div className="w-8 h-8"></div>
                
//                 <span className={`text-base font-medium flex-1 text-center ${njInsurancePlan === 'no' ? 'text-white' : 'text-gray-800'}`}>
//                   No, my plan is in a different state
//                 </span>
                
//                 <div className="w-8 h-8 flex items-center justify-center">
//                   {njInsurancePlan === 'no' && (
//                     <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
//                       <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
//                     </div>
//                   )}
//                 </div>
//               </button>
//             </div>

//             {/* Show options based on selection */}
//             {njInsurancePlan === 'yes' && (
//               <Button
//                 onClick={() => {
//                   // Set state to NJ and go to insurance form
//                   setFormData(prev => ({ ...prev, state: 'NJ' }));
//                   setCurrentStep(7);
//                 }}
//                 className="w-full py-3 px-6 rounded-full text-base font-medium transition-colors duration-200 bg-blue-100 text-gray-800 hover:bg-blue-200"
//                 style={{ fontFamily: 'var(--font-inter)' }}
//               >
//                 Verify my insurance benefits
//                 <ChevronRight className="inline w-4 h-4 ml-2" />
//               </Button>
//             )}

//             {njInsurancePlan === 'no' && (
//               <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 space-y-4">
//                 <div className="text-center px-2">
//                   <p className="text-sm text-gray-600 mb-2 leading-relaxed">
//                     We're currently only accepting NJ insurance plans, but we're expanding quickly to other states.
//                   </p>
//                   <p className="text-sm text-gray-600 mb-4 leading-relaxed">
//                     We offer care for $30/session out-of-pocket where you'll be matched to an intern-therapist.
//                   </p>
//                 </div>
                
//                 <Button
//                   onClick={() => {
//                     // Switch to cash pay flow
//                     setCurrentStep(5); // Go to state selection
//                   }}
//                   className="w-full py-3 px-4 md:px-6 rounded-full text-sm md:text-base font-medium transition-colors duration-200 bg-yellow-100 text-gray-800 hover:bg-yellow-200"
//                   style={{ fontFamily: 'var(--font-inter)' }}
//                 >
//                   <span className="block md:hidden">Choose $30/Session Out-Of-Pocket</span>
//                   <span className="hidden md:block">Choose $30 Per Session Out-Of-Pocket</span>
//                   <ChevronRight className="inline w-4 h-4 ml-2" />
//                 </Button>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Insurance Form Screen (Step 6)
//   if (currentStep === 7) {
//     return (
//       <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
//         {/* Header with image */}
//         <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
//           <img 
//             src="/onboarding-banner.jpg" 
//             alt="" 
//             className="w-full h-full object-cover"
//           />
//           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
//           <div className="absolute inset-0 flex items-center justify-center">
//             <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
//                 style={{ 
//                   fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
//                   fontWeight: 400,
//                   letterSpacing: '0.02em',
//                   lineHeight: '1.1'
//                 }}>
//               CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
//             </p>
//           </div>
//         </div>

//         {/* Navigation */}
//         <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
//           <button onClick={() => setCurrentStep(6)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
//             <ChevronLeft className="w-6 h-6 text-gray-600" />
//           </button>
//           <div className="w-10"></div>
//           <div className="w-10"></div>
//         </div>

//         {/* Content */}
//         <div className="flex-1 flex items-center justify-center px-6 pb-14">
//           <div className="flow-narrow w-full -mt-6 sm:-mt-8 mx-auto">
//             <div className="text-center mb-8 flow-narrow mx-auto">
//               <h1 className="text-2xl sm:text-3xl md:text-4xl mb-4 text-gray-800" 
//                   style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
//                 Great, We're In Network!
//               </h1>
//               <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
//                 Next, to verify your eligibility and estimate your co-pay, please enter your insurance information below.
//               </p>
//             </div>

//             {/* Form - Only show when in form or verifying state */}
//             {(verificationStep === 'form' || verificationStep === 'verifying') && (
//               <div className="space-y-6 mb-8 flow-narrow mx-auto">
//                 {/* Insurance Provider */}
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Insurance Provider*
//                   </label>
//                   <select
//                     value={selectedProvider}
//                     onChange={(e) => setSelectedProvider(e.target.value)}
//                     disabled={verificationStep === 'verifying'}
//                     className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106]"
//                     style={{ fontFamily: 'var(--font-inter)' }}
//                   >
//                     <option value="">Select provider</option>
//                     {insuranceProviders.map((provider) => (
//                       <option key={provider.id} value={provider.name}>
//                         {provider.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 {/* Legal Name Row (md+ two columns) */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {/* Legal First Name - Pre-filled from earlier */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Legal First Name*
//                     </label>
//                     <input
//                       type="text"
//                       value={formData.firstName}
//                       onChange={(e) => handleInputChange('firstName', e.target.value)}
//                       disabled={verificationStep === 'verifying'}
//                       className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106] text-base sm:text-lg"
//                       style={{ fontFamily: 'var(--font-inter)' }}
//                       placeholder="John"
//                     />
//                   </div>

//                   {/* Legal Last Name */}
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Legal Last Name*
//                     </label>
//                     <input
//                       type="text"
//                       value={formData.lastName}
//                       onChange={(e) => handleInputChange('lastName', e.target.value)}
//                       disabled={verificationStep === 'verifying'}
//                       className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106] text-base sm:text-lg"
//                       style={{ fontFamily: 'var(--font-inter)' }}
//                       placeholder="Last Name"
//                     />
//                   </div>
//                 </div>

//                 {/* Date of Birth */}
//                 <div className="flow-narrow">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Date of Birth*
//                   </label>
//                   <input
//                     type="date"
//                     value={formData.dateOfBirth}
//                     onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
//                     disabled={verificationStep === 'verifying'}
//                     className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106]"
//                     style={{ fontFamily: 'var(--font-inter)' }}
//                   />
//                 </div>

//                 {/* Member ID */}
//                 <div className="flow-narrow">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Member ID*
//                   </label>
//                   <input
//                     type="text"
//                     value={formData.memberId}
//                     onChange={(e) => handleInputChange('memberId', e.target.value)}
//                     disabled={verificationStep === 'verifying'}
//                     className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106]"
//                     style={{ fontFamily: 'var(--font-inter)' }}
//                     placeholder="Enter your member ID"
//                   />
//                 </div>

// {/* Email already collected in earlier step - no need to show again */}

//                 {/* Display preferred name info */}
//                 {formData.preferredName && formData.preferredName !== formData.firstName && (
//                   <div className="bg-blue-50 p-3 rounded-lg">
//                     <p className="text-sm text-blue-800 text-center">
//                       <strong>Note:</strong> Your therapist will address you as "{formData.preferredName}"
//                     </p>
//                   </div>
//                 )}
//               </div>
//             )}

//             {/* Compact form summary when verification is successful or failed */}
//             {(verificationStep === 'success' || verificationStep === 'failed') && (
//               <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
//                 <div className="grid grid-cols-2 gap-4 text-sm">
//                   <div>
//                     <span className="text-gray-600">Provider:</span>
//                     <p className="font-medium">{selectedProvider}</p>
//                   </div>
//                   <div>
//                     <span className="text-gray-600">Name:</span>
//                     <p className="font-medium">{formData.firstName} {formData.lastName}</p>
//                   </div>
//                   <div>
//                     <span className="text-gray-600">Member ID:</span>
//                     <p className="font-medium">{formData.memberId}</p>
//                   </div>
//                   <div>
//                     <span className="text-gray-600">DOB:</span>
//                     <p className="font-medium">{formData.dateOfBirth}</p>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Verification States */}
//             {verificationStep === 'form' && (
//               <Button
//                 onClick={handleInsuranceVerification}
//                 disabled={!selectedProvider || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId}
//                 className={`flow-narrow mx-auto w-full py-5 px-8 rounded-full text-lg font-medium transition-colors ${
//                   selectedProvider && formData.firstName && formData.lastName && formData.dateOfBirth && formData.memberId
//                     ? 'bg-amber-700 text-white hover:bg-amber-800' 
//                     : 'bg-gray-100 text-gray-400 cursor-not-allowed'
//                 }`}
//                 style={{ fontFamily: 'var(--font-inter)' }}
//               >
//                 Verify Insurance
//                 <ChevronRight className="inline w-5 h-5 ml-2" />
//               </Button>
//             )}

//             {verificationStep === 'verifying' && (
//               <div className="text-center py-8">
//                 <div className="flex items-center justify-center space-x-3 mb-4">
//                   <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center animate-pulse">
//                     <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
//                   </div>
//                 </div>
//                 <h3 className="text-lg font-medium text-gray-800 mb-2">Verifying Your Insurance...</h3>
//                 <p className="text-sm text-gray-600">This usually takes just a few seconds...</p>
//               </div>
//             )}

//             {verificationStep === 'success' && (
//               <div className="space-y-4">
//                 <div className="text-center py-4">
//                   <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
//                     <Check className="w-6 h-6 text-green-600" />
//                   </div>
//                   <h3 className="text-lg font-medium text-gray-800 mb-2">You're Covered!</h3>
//                   {verificationResponse?.benefits && (
//                     <>
//                       {/* Green Box - Main Benefits Display */}
//                       <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
//                         <div className="text-green-800">
//                           <p className="font-medium text-base mb-2">
//                             {getBenefitsDisplay(verificationResponse.benefits, tradingPartnerServiceIdMap[selectedProvider as keyof typeof tradingPartnerServiceIdMap]).largeText}
//                           </p>
//                           <p className="text-sm text-green-700">
//                             {getBenefitsDisplay(verificationResponse.benefits, tradingPartnerServiceIdMap[selectedProvider as keyof typeof tradingPartnerServiceIdMap]).smallText}
//                           </p>
//                         </div>
//                       </div>

//                       {/* Yellow Box - Additional Details (if applicable) */}
//                       {getBenefitsDisplay(verificationResponse.benefits, tradingPartnerServiceIdMap[selectedProvider as keyof typeof tradingPartnerServiceIdMap]).additionalDetails && (
//                         <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
//                           <div className="text-yellow-800">
//                             <p className="text-sm leading-relaxed whitespace-pre-line">
//                               {getBenefitsDisplay(verificationResponse.benefits, tradingPartnerServiceIdMap[selectedProvider as keyof typeof tradingPartnerServiceIdMap]).additionalDetails}
//                             </p>
//                           </div>
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </div>
                
//                 <Button
//                   onClick={handleInsuranceComplete}
//                   className="w-full py-5 px-8 rounded-full text-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
//                   style={{ fontFamily: 'var(--font-inter)' }}
//                 >
//                   Continue to Questionnaire
//                   <ChevronRight className="inline w-5 h-5 ml-2" />
//                 </Button>
//               </div>
//             )}

//             {verificationStep === 'failed' && (
//               <div className="space-y-4">
//                 <div className="text-center py-4">
//                   <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
//                     <X className="w-6 h-6 text-red-600" />
//                   </div>
//                   <h3 className="text-lg font-medium text-gray-800 mb-2">Verification Failed</h3>
//                   <p className="text-sm text-gray-600">Please check your information and try again.</p>
//                 </div>
                
//                 <div className="flex space-x-3">
//                   <Button
//                     onClick={() => setVerificationStep('form')}
//                     variant="outline"
//                     className="flex-1 py-3 px-4 rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
//                     style={{ fontFamily: 'var(--font-inter)' }}
//                   >
//                     Try Again
//                   </Button>
//                   <Button
//                     onClick={() => setCurrentStep(5)} // Go to cash pay flow (state selection)
//                     className="flex-1 py-3 px-4 rounded-full bg-yellow-100 text-gray-800 hover:bg-yellow-200"
//                     style={{ fontFamily: 'var(--font-inter)' }}
//                   >
//                     Pay $30/Session
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return null;
// }

// OnboardingFlow.tsx

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Check, Loader2, ArrowRight } from "lucide-react";
import { VIDEOS } from "@/lib/videos";
import { Button } from "@/components/ui/button";
import { checkEligibility } from "../app/api/eligibility.js";
import { PAYER_ID_BY_PROVIDER, NPI, getSessionCostForPayer } from "@/api/eligibilityConfig";
import { useInputFocus } from "@/hooks/useInputFocus";

interface EligibilityBenefits {
  copay: string;
  coinsurance: string;
  memberObligation: string;
  deductible: string;
  remainingDeductible: string;
  oopMax: string;
  remainingOopMax: string;
  benefitStructure: string;
}

interface VerificationResponse {
  benefits?: EligibilityBenefits;
  subscriber?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    memberId?: string;
  };
  [key: string]: unknown;
}

interface OnboardingFlowProps {
  onComplete: (data: {
    firstName: string;
    lastName: string;
    email: string;
    preferredName?: string;
    state?: string;
    provider?: string;
    memberId?: string;
    dateOfBirth?: string;
    paymentType?: string;
    whatBringsYou?: string;
    verificationData?: VerificationResponse;
  }) => void;
  onSelectPaymentType: (type: "insurance" | "cash_pay") => void;
  initialStep?: number;
}

// Benefits display logic function (session rate can vary by payer)
function getBenefitsDisplay(benefits: EligibilityBenefits, payerIdOverride?: string) {
  // Parse numeric values from string amounts
  const parseAmount = (amount: string): number => {
    return parseFloat(amount.replace(/[$,]/g, '')) || 0;
  };

  const memberObligation = parseAmount(benefits.memberObligation);
  const remainingDeductible = parseAmount(benefits.remainingDeductible);
  const deductible = parseAmount(benefits.deductible);
  const copay = parseAmount(benefits.copay);
  const coinsurance = parseFloat(benefits.coinsurance.replace('%', '')) || 0;
  const benefitStructure = benefits.benefitStructure || '';
  
  // Session rate (allowed amount) varies by payer; default fallback=200
  const sessionRate90791 = getSessionCostForPayer(payerIdOverride, 200);

  // Determine if this is a range display (has coinsurance component)
  const hasCoinsurance = benefitStructure.toLowerCase().includes('coinsurance') || 
                         benefitStructure.toLowerCase().includes('co-insurance') ||
                         coinsurance > 0;

  // Calculate display amount
  let displayAmount: string;
  if (memberObligation > 100) {
    // For high member obligations, show fixed range of $90-110
    displayAmount = `$90-$110`;
  } else if (hasCoinsurance && memberObligation > 0) {
    const lower = memberObligation;
    const higher = Math.min(memberObligation + (sessionRate90791 - memberObligation), sessionRate90791);
    displayAmount = `$${lower.toFixed(0)}-$${higher.toFixed(0)}`;
  } else {
    displayAmount = `$${memberObligation.toFixed(0)}`;
  }

  // Main display text
  const largeText = hasCoinsurance && memberObligation > 0
    ? `Based on your benefits, you can expect to pay ${displayAmount} for your sessions.`
    : `Based on your benefits, you can expect to pay ${displayAmount} for your sessions.`;

  const smallText = hasCoinsurance
    ? "This is just an estimation based on the insurance information we received, including any remaining deductible or out-of-pocket maximum."
    : "This is just an estimation based on the insurance information we received.";

  // Additional details logic
  let additionalDetails: string | null = null;

  // Check for specific benefit structures requiring additional details
  const isFullyCovered = benefitStructure.toLowerCase().includes('fully covered') || memberObligation === 0;
  const hasAfterDeductible = benefitStructure.toLowerCase().includes('after deductible') || 
                             benefitStructure.toLowerCase().includes('deductible');

  if (isFullyCovered && !hasAfterDeductible) {
    // Path 6: Fully covered
    additionalDetails = "Great news—your sessions are fully covered by insurance. You won't owe anything.";
  } else if (isFullyCovered && hasAfterDeductible) {
    // Path 7: Fully covered after deductible
    if (remainingDeductible > 0) {
      additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} to go. After that, your sessions will be $0.`;
    } else {
      additionalDetails = "Great news—you've already hit your deductible, so your sessions are fully covered by insurance. You won't owe anything.";
    }
  } else if (hasAfterDeductible && copay > 0 && !hasCoinsurance) {
    // Path 8 & 9: Copay after deductible
    if (remainingDeductible > 0) {
      additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} to go. After that, your cost drops to just your copay ($${copay.toFixed(0)}) per session.`;
    } else {
      additionalDetails = `You've already hit your deductible, so you'll pay your copay of $${copay.toFixed(0)} per session.`;
    }
  } else if (hasAfterDeductible && hasCoinsurance && copay === 0) {
    // Path 10 & 11: Coinsurance after deductible
    if (remainingDeductible > 0) {
      additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} left to go. After that, you'll only pay ${coinsurance}% of each session cost.`;
    } else {
      additionalDetails = "You've already hit your deductible, so you'll just pay your estimated coinsurance (your share of the session cost).";
    }
  } else if (hasAfterDeductible && hasCoinsurance && copay > 0) {
    // Path 12: Copay and coinsurance after deductible
    if (remainingDeductible > 0) {
      additionalDetails = `You'll pay this full session rate until you reach your deductible of $${deductible.toFixed(0)}. You still have $${remainingDeductible.toFixed(0)} left to go. After that, you'll pay your estimated copay and coinsurance.`;
    } else {
      additionalDetails = "You've already hit your deductible, so you'll pay your estimated copay and coinsurance (your share of the session cost).";
    }
  }

  return {
    largeText,
    smallText,
    additionalDetails
  };
}

export default function OnboardingFlow({ 
  onComplete, 
  onSelectPaymentType,
  initialStep = 0 
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    preferredName: '',
    email: '',
    state: '',
    provider: '',
    memberId: '',
    dateOfBirth: '',
    whatBringsYou: ''
  });
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [screenType, setScreenType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isWideScreen, setIsWideScreen] = useState(false);

  // Input focus hooks for better mobile keyboard handling
  const nameInputRef = useInputFocus({ scrollOffset: 100 });
  const emailInputRef = useInputFocus({ scrollOffset: 100 });
  const [screenReady, setScreenReady] = useState(false);
  // Initial video loading state
  const [initialVideoReady, setInitialVideoReady] = useState(false);

  // Scroll to top on step changes to prevent inheriting previous viewport offset
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.__appScrollToTop === 'function') {
      window.__appScrollToTop(false);
    }
  }, [currentStep]);

  // State selection variables
  const [selectedState, setSelectedState] = useState('');
  const [showOtherStateInput, setShowOtherStateInput] = useState(false);
  const [otherStateSearch, setOtherStateSearch] = useState('');
  const [showWaitlistPopup, setShowWaitlistPopup] = useState(false);
  const [waitlistState, setWaitlistState] = useState('');
  const [isOtherInputFocused, setIsOtherInputFocused] = useState(false);

  // Insurance verification variables
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResponse, setVerificationResponse] = useState<VerificationResponse | null>(null);
  const [verificationStep, setVerificationStep] = useState<'form' | 'verifying' | 'success' | 'failed'>('form');
  
  // NJ insurance plan verification
  const [njInsurancePlan, setNjInsurancePlan] = useState<'yes' | 'no' | null>(null);

  // Define featured states (supported states)
  const featuredStates = ['NY', 'NJ', 'CA', 'TX', 'FL'];

  // Insurance providers
  const insuranceProviders = [
    { id: "aetna", name: "Aetna" },
    { id: "meritain", name: "Meritain Health" },
    { id: "horizon_bcbs_nj", name: "Horizon Blue Cross Blue Shield of NJ" },
    { id: "amerihealth", name: "AmeriHealth" }
  ];

  // Trading partner service ID mapping
  const tradingPartnerServiceIdMap: Record<string, string> = PAYER_ID_BY_PROVIDER;

  // All US states
  const allStates = [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' }
  ];

  // Filter states based on search
  const filteredStates = allStates.filter(state => 
    state.name.toLowerCase().includes(otherStateSearch.toLowerCase()) && 
    !featuredStates.includes(state.code)
  );

  // Detect viewport orientation and screen type
  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = height / width;
      
      setIsPortrait(aspectRatio > 1);
      setIsWideScreen(width > 1024); // Changed from 1400 to 1024 to match the logic
      
      // Prefer width threshold for mobile to ensure vertical video on phones
      if (width < 1200) {
        setScreenType('mobile');
      } else if (aspectRatio > 1) {
        setScreenType('tablet');
      } else {
        setScreenType('desktop');
      }
      setScreenReady(true);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  const [expandedCard, setExpandedCard] = useState<'insurance' | 'cash_pay' | null>(null);

  const handleContinue = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1 && formData.preferredName) {
      setCurrentStep(2);
    } else if (currentStep === 2 && formData.whatBringsYou) {
      setCurrentStep(3);
    } else if (currentStep === 3 && formData.email) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleInputChange = (field: 'firstName' | 'lastName' | 'preferredName' | 'email' | 'provider' | 'memberId' | 'dateOfBirth' | 'whatBringsYou', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentSelection = (type: "insurance" | "cash_pay") => {
    if (type === "cash_pay") {
      setCurrentStep(5); // Go to state selection
    } else {
      setCurrentStep(6); // Go to NJ insurance plan verification first
    }
  };

  const handleStateSelection = (stateCode: string) => {
    setSelectedState(stateCode);
    // Clear the other state input when selecting any state
    setShowOtherStateInput(false);
    setOtherStateSearch('');
    setFormData(prev => ({ ...prev, state: stateCode }));
  };

  const handleStateConfirm = () => {
    if (selectedState) {
      if (!featuredStates.includes(selectedState)) {
        // Show waitlist popup for unsupported states
        setWaitlistState(allStates.find(s => s.code === selectedState)?.name || selectedState);
        setShowWaitlistPopup(true);
      } else {
        // Proceed with supported state
        // Ensure preferred name is capitalized
        const capitalizedPreferredName = formData.preferredName 
          ? formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase()
          : '';

        // For cash_pay at state selection, we only need email and preferred name
        // firstName and lastName will be collected in the next step
        if (!formData.email || !formData.preferredName) {
          console.warn('Missing required fields for cash pay state selection:', {
            email: !!formData.email,
            preferredName: !!formData.preferredName
          });
          return; // Don't proceed without required fields
        }

        onComplete({
          firstName: capitalizedPreferredName, // Use preferred name as firstName for now
          lastName: '', // Will be collected in next step
          email: formData.email,
          preferredName: capitalizedPreferredName,
          state: selectedState,
          paymentType: 'cash_pay',
          whatBringsYou: formData.whatBringsYou
        });
        onSelectPaymentType("cash_pay");
      }
    }
  };

  const handleInsuranceVerification = async () => {
    // Validate required fields (email already collected in earlier step)
    if (!selectedProvider || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId) {
      return;
    }

    setVerificationStep('verifying');
    setIsVerifying(true);

    // Format date of birth for API (YYYYMMDD)
    const formatDOB = (dobStr: string): string | null => {
      const [year, month, day] = dobStr.split("-");
      if (!year || !month || !day) return null;
      return `${year}${month}${day}`;
    };

    const dobFormatted = formatDOB(formData.dateOfBirth);
    
    if (!dobFormatted) {
      setVerificationStep('failed');
      setIsVerifying(false);
      return;
    }

    // Prepare API payload
    const payerId = tradingPartnerServiceIdMap[selectedProvider];
    const sessionCostDollars = getSessionCostForPayer(payerId, 200);
    const sessionCostCents = Math.round(sessionCostDollars * 100);
    
    console.log('💰 OnboardingFlow Session Cost:', {
      selectedProvider,
      payerId,
      sessionCostDollars,
      sessionCostCents
    });

    const payload = {
      controlNumber: "987654321",
      tradingPartnerServiceId: payerId,
      provider: {
        organizationName: "Sol Health",
        npi: NPI,
        sessionCost: sessionCostCents
      },
      subscriber: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: dobFormatted,
        memberId: formData.memberId
      }
    };

    try {
      const responseData = await checkEligibility(payload);
      setVerificationResponse(responseData);
      setVerificationStep('success');
      
      // Update form data with verified information from response
      if (responseData.subscriber) {
        setFormData(prev => ({
          ...prev,
          firstName: responseData.subscriber?.firstName || prev.firstName,
          lastName: responseData.subscriber?.lastName || prev.lastName,
          dateOfBirth: responseData.subscriber?.dateOfBirth || prev.dateOfBirth,
          memberId: responseData.subscriber?.memberId || prev.memberId
        }));
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStep('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInsuranceComplete = () => {
    // Ensure preferred name is capitalized
    const capitalizedPreferredName = formData.preferredName 
      ? formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase()
      : formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase();

    // Complete the onboarding with verified insurance data
    onComplete({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      preferredName: capitalizedPreferredName,
      state: 'NJ', // Default to NJ for insurance
      provider: selectedProvider,
      memberId: formData.memberId,
      dateOfBirth: formData.dateOfBirth,
      paymentType: 'insurance',
      whatBringsYou: formData.whatBringsYou,
      verificationData: verificationResponse || undefined // Include verification response
    });
    onSelectPaymentType("insurance");
  };

  // Preload all videos at runtime to reduce startup delay
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const warmVideos: HTMLVideoElement[] = [];
    let cancelled = false;

    // 1) Ensure local onboarding videos are requested first from the app directory
    const localOnboardingSources = ['/onboarding-video-9x16.mp4', '/onboarding-video-16x9.mp4'];

    const waitForLocalOnboarding = new Promise<void>((resolve) => {
      let readyCount = 0;
      const markReady = () => {
        readyCount += 1;
        if (readyCount >= localOnboardingSources.length) resolve();
      };

      localOnboardingSources.forEach((href) => {
        const v = document.createElement('video');
        v.src = href;
        v.preload = 'auto';
        v.muted = true;
        v.setAttribute('playsinline', '');
        v.oncanplaythrough = markReady;
        v.onloadeddata = markReady;
        try {
          v.load();
        } catch {}
        warmVideos.push(v);
      });

      // Fallback in case events don't fire quickly
      setTimeout(() => resolve(), 1500);
    });

    // 2) After local onboarding is warmed, warm remote videos sequentially to avoid contention
    waitForLocalOnboarding.then(() => {
      if (cancelled) return;

      const urls = Object.entries(VIDEOS)
        .map(([, href]) => href)
        .filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
        // do not warm onboarding remotes to avoid duplicate downloads; local versions are preferred
        .filter((u) => !/onboarding-video-(?:9x16|16x9)\.mp4$/i.test(u));

      const loadSequential = (index: number) => {
        if (cancelled || index >= urls.length) return;
        const href = urls[index];
        const v = document.createElement('video');
        v.src = href;
        v.preload = 'auto';
        v.muted = true;
        v.setAttribute('playsinline', '');
        const next = () => loadSequential(index + 1);
        v.oncanplaythrough = next;
        v.onloadeddata = next;
        try {
          v.load();
        } catch {}
        warmVideos.push(v);
      };

      // start sequential warm
      loadSequential(0);
    });

    return () => {
      cancelled = true;
      warmVideos.forEach((v) => {
        try {
          v.src = '';
        } catch {}
      });
    };
  }, []);

  // Splash Screen with Video
  if (currentStep === 0) {
    if (!screenReady) {
      return (
        <div className="relative bg-black min-h-screen w-full overflow-hidden" />
      );
    }
    // Mobile portrait layout - 9:16 video full screen
    if (screenType === 'mobile') {
      return (
        <div className="relative bg-black h-[100dvh] w-full overscroll-none">
          <video 
            className="absolute inset-0 w-full h-full object-cover object-bottom"
            autoPlay 
            muted 
            playsInline
            loop={false}
            controls={false}
            preload="auto"
            onCanPlayThrough={() => setInitialVideoReady(true)}
            onEnded={handleContinue}
          >
            <source src="/onboarding-video-9x16.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Bottom Continue button (match CustomSurvey) */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex justify-center">
            <Button
              onClick={handleContinue}
              className="py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-all min-w-[200px] max-w-[300px]"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
            </Button>
          </div>

          {!initialVideoReady && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="flex items-center space-x-2 text-white">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // iPad/Tablet portrait - show only 16x9 video, auto-advance
    if (screenType === 'tablet') {
      return (
        <div className="relative bg-black min-h-screen w-full overflow-hidden">
          <video
            className="absolute inset-0 w-full h-full object-contain bg-black"
            autoPlay
            muted
            playsInline
            loop={false}
            controls={false}
            preload="auto"
            onEnded={handleContinue}
          >
            <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Bottom Continue button (match CustomSurvey) */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex justify-center">
            <Button
              onClick={handleContinue}
              className="py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-all min-w-[200px] max-w-[300px]"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
            </Button>
          </div>
        </div>
      );
    }

    // Desktop landscape (narrow) - full-screen 16x9 video, auto-advance
    if (isWideScreen === false && screenType === 'desktop') {
      return (
        <div className="relative bg-black min-h-screen w-full overflow-hidden">
          <video 
            className="absolute inset-0 w-full h-full object-contain bg-black"
            autoPlay 
            muted 
            playsInline
            loop={false}
            controls={false}
            preload="auto"
            onEnded={handleContinue}
          >
            <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Bottom Continue button (match CustomSurvey) */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex justify-center">
            <Button
              onClick={handleContinue}
              className="py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-all min-w-[200px] max-w-[300px]"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
            </Button>
          </div>
        </div>
      );
    }

    // Desktop landscape - wide screens: full-screen 16x9 video, auto-advance
    return (
      <div className="relative bg-black min-h-screen w-full overflow-hidden">
        <video 
          className="absolute inset-0 w-full h-full object-contain bg-black"
          autoPlay 
          muted 
          playsInline
          loop={false}
          controls={false}
          preload="auto"
          onEnded={handleContinue}
        >
          <source src="/onboarding-video-16x9.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Bottom Continue button (match CustomSurvey) */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8 flex justify-center">
          <Button
            onClick={handleContinue}
            className="py-5 px-8 bg-transparent border-2 border-gray-300 rounded-2xl text-gray-800 text-lg font-medium hover:bg-[#F5E8D1] transition-all min-w-[200px] max-w-[300px]"
            style={{ fontFamily: 'var(--font-inter)' }}
          >
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Name Input Screen - Only Preferred Name
  if (currentStep === 1) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with sunset image - fixed height */}
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation - fixed height */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
              <img
              src="/sol-health-logo.svg"
              alt="Sol Health"
              className="h-5 w-auto"
            />
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content - truly centered with only preferred name */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="flow-narrow w-full -mt-16 mx-auto">
            <div className="text-center mb-12">
              <span className="text-5xl mb-6 block">👋</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What can we call you?
              </h1>
            </div>

            {/* Single Preferred Name Input */}
            <div className="mb-8">
              <input
                ref={nameInputRef}
                type="text"
                value={formData.preferredName}
                onChange={(e) => handleInputChange('preferredName', e.target.value)}
                onFocus={() => setShowKeyboard(true)}
                onBlur={() => setShowKeyboard(false)}
                placeholder=""
                className="w-full text-base sm:text-lg font-light border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-800 placeholder-gray-400 transition-colors duration-200 text-center"
                style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="words"
                inputMode="text"
              />

            </div>

            <Button
              onClick={handleContinue}
              disabled={!formData.preferredName.trim()}
              className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-colors duration-200 ${
                formData.preferredName.trim() 
                  ? 'bg-yellow-100 text-gray-800 hover:bg-yellow-200' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
              <ChevronRight className="inline w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // What brings you here today? (New screen)
  if (currentStep === 2) {
    // What brings you here today? (New screen)
    const options = [
      {
        title: "I'm navigating a life change",
        desc: "Big or small, life shifts. Find your footing, your new life rhythm, and yourself amidst transition and uncertainty.",
        color: '',
        bgColor: '#e2ebff',
        shadowColor: '#373842',
        textColor: '#373842'
      },
      {
        title: "I want help with something specific",
        desc: "Anxiety, depression, trauma, relationships, and patterns that feel hard to change. Get personalized care.",
        color: '',
        bgColor: '#e6cab0',
        shadowColor: '#5d3107',
        textColor: '#5d3107'
      },
      {
        title: "I'm feeling really overwhelmed",
        desc: "Stress, burnout, auto-pilot, too much on your shoulders. Build coping tools and find space for you and what you truly want.",
        color: '',
        bgColor: '#fff8ca',
        shadowColor: '#e6c9af',
        textColor: '#8B4513'
      },
      {
        title: "I'm not sure how to put it into words",
        desc: "You just want to feel better. You're not alone—we'll explore together so you feel seen, heard, and moving forward.",
        color: '',
        bgColor: '#f9f9f9',
        shadowColor: '#b2b2b4',
        textColor: '#666666'
      }
    ];

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
          <img src="/onboarding-banner.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              WE'RE SO HAPPY<br/>YOU'RE HERE
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <img src="/sol-health-logo.svg" alt="Sol Health" className="h-5 w-auto" />
          </div>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-10">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800" style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What brings you here today?
              </h1>
            </div>
 
            <div className="space-y-3 w-full flex flex-col items-center">
              {options.map((opt) => (
                <button
                  key={opt.title}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, whatBringsYou: opt.title }));
                    setCurrentStep(3); // go straight to email step
                  }}
                  className={`relative w-80 max-w-full text-left ${opt.color} rounded-xl pt-1.5 pb-2.5 px-2.5 md:pt-2 md:pb-3 md:px-3.5 hover:brightness-95 transition-colors`}
                  style={{ 
                    fontFamily: 'var(--font-inter)',
                    backgroundColor: opt.bgColor,
                    boxShadow: `2px 2px 0 ${opt.shadowColor}`
                  }}
                >
                  <p className="very-vogue-title text-lg md:text-xl mb-0.5" style={{ color: opt.textColor }}>{opt.title}</p>
                  <p className="text-[12px] md:text-[13px] leading-snug" style={{ color: opt.textColor }}>{opt.desc}</p>
                  <ArrowRight className="absolute bottom-2.5 right-2.5 w-4 h-4 md:w-5 md:h-5" style={{ color: opt.textColor }} />
                </button>
              ))}
            </div>

            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, whatBringsYou: 'Other' }));
                  setCurrentStep(3); // go to email step
                }}
                className="text-sm md:text-base font-medium underline text-gray-700 hover:text-gray-900"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Other
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Email Input Screen (Step 3)
  if (currentStep === 3) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with sunset image */}
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <img
              src="/sol-health-logo.svg"
              alt="Sol Health"
              className="h-5 w-auto"
            />
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content - Email Input */}
        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="flow-narrow w-full -mt-16 mx-auto">
            <div className="text-center mb-12">
              <span className="text-5xl mb-6 block">📧</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What's Your Email?
              </h1>
            </div>

            {/* Email Input */}
            <div className="mb-8">
              <input
                ref={emailInputRef}
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onFocus={() => setShowKeyboard(true)}
                onBlur={() => setShowKeyboard(false)}
                placeholder="well@being.com"
                className="w-full text-base sm:text-lg font-light border-b-2 border-gray-300 pb-3 focus:border-gray-600 focus:outline-none bg-transparent text-gray-800 placeholder-gray-400 transition-colors duration-200 text-center"
                style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}
                autoComplete="email"
                autoCorrect="off"
                autoCapitalize="off"
                inputMode="email"
              />
            </div>

            <Button
              onClick={handleContinue}
              disabled={!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)}
              className={`w-full py-5 px-8 rounded-full text-lg font-medium transition-colors duration-200 ${
                formData.email.trim() && /\S+@\S+\.\S+/.test(formData.email)
                  ? 'bg-yellow-100 text-gray-800 hover:bg-yellow-200' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Continue
              <ChevronRight className="inline w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Payment Selection Screen (Step 4)
  if (currentStep === 4) {
    // Capitalize first letter of name
    const displayName = formData.preferredName 
      ? formData.preferredName.charAt(0).toUpperCase() + formData.preferredName.slice(1).toLowerCase()
      : formData.firstName 
        ? formData.firstName.charAt(0).toUpperCase() + formData.firstName.slice(1).toLowerCase()
        : 'there';

    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header - fixed height */}
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation - fixed height */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div 
            className={`flex items-center transition-all duration-1000 ease-in-out ${
              expandedCard ? 'transform -translate-y-8 scale-0 opacity-0' : ''
            }`}
          >
            <h2 className="text-lg md:text-xl lg:text-2xl" style={{ fontFamily: 'var(--font-inter)' }}>
              Sol Health
            </h2>
            <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full ml-2"></div>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content - truly centered in remaining space */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-12">
          <div className="flow-narrow w-full -mt-12 mx-auto">
            <div className="text-center mb-6 md:mb-8">
              <span className="text-3xl md:text-5xl mb-3 md:mb-4 block">🎉</span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl mb-3 md:mb-4 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                Welcome {displayName}
              </h1>
              <p className="text-gray-600 text-sm md:text-base px-2" style={{ fontFamily: 'var(--font-inter)' }}>
                Learn about our accessible offerings and choose what's most relevant for you.
              </p>
            </div>

            {/* Option Cards */}
            <div className="space-y-3 md:space-y-4">
              {/* Insurance Card */}
              <div className="w-full overflow-hidden">
                <button
                  onClick={() => {
                    if (expandedCard === 'insurance') {
                      setExpandedCard(null);
                    } else {
                      setExpandedCard('insurance');
                    }
                  }}
                  className={`w-full text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors duration-700 ease-in-out ${
                    expandedCard === 'insurance' 
                      ? 'rounded-t-2xl border-b-0' 
                      : 'rounded-2xl'
                  }`}
                  style={{
                    padding: expandedCard === 'insurance' ? '16px 20px 12px 20px' : '16px 20px'
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                      Use My Insurance (NJ Only)
                    </h3>
                    <span className="text-xs md:text-sm text-gray-600 font-medium flex items-center transition-transform" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                      {expandedCard === 'insurance' ? 'Show Less' : 'Learn More'}
                      <ChevronRight className={`inline w-3 md:w-4 h-3 md:h-4 ml-1 transition-transform duration-300 ${expandedCard === 'insurance' ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600 text-xs md:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                      Associate Therapists
                    </p>
                    <span className="inline-block rounded-full bg-blue-100 text-gray-800 px-2 py-0.5 text-[11px] md:text-xs font-medium">
                      ~$20-40 average session cost
                    </span>
                  </div>
                </button>
                
                {/* Expanded Insurance Content */}
                <div className={`bg-white border-l border-r border-b border-blue-200 rounded-b-2xl transition-all duration-700 ease-in-out overflow-hidden ${
                  expandedCard === 'insurance' 
                    ? 'max-h-[1000px] opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-5 space-y-4 pb-6">
                     
                     <div>
                       <p className="text-sm font-medium text-gray-800 mb-2">We currently accept:</p>
                       <p className="text-sm text-gray-600">Aetna, Amerihealth, Horizon Blue Cross Blue Shield, Meritain Health</p>
                     </div>
                     
                     <div>
                       <p className="text-sm font-medium text-gray-800 mb-2">What to expect:</p>
                       <ul className="text-sm text-gray-600 space-y-1">
                         <li>• 1-1 virtual sessions (55 min)</li>
                         <li>• We'll automatically verify your benefits and estimate what you'll pay</li>
                         <li>• You'll be matched with an Associate Therapist. Associate Therapists have graduated from their counseling programs, have a provisional license, and are working towards full licensure.</li>
                       </ul>
                     </div>
                     
                     <Button
                       onClick={() => handlePaymentSelection("insurance")}
                       className="w-full bg-blue-200 hover:bg-blue-300 text-gray-800 py-3"
                     >
                       Select Insurance Option
                     </Button>
                   </div>
                 </div>
               </div>

              {/* Cash Pay Card */}
              <div className="w-full overflow-hidden">
                <button
                  onClick={() => {
                    if (expandedCard === 'cash_pay') {
                      setExpandedCard(null);
                    } else {
                      setExpandedCard('cash_pay');
                    }
                  }}
                  className={`w-full text-left bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 transition-colors duration-700 ease-in-out ${
                    expandedCard === 'cash_pay' 
                      ? 'rounded-t-2xl border-b-0' 
                      : 'rounded-2xl'
                  }`}
                  style={{
                    padding: expandedCard === 'cash_pay' ? '16px 20px 12px 20px' : '16px 20px'
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800" style={{ fontFamily: 'var(--font-inter)' }}>
                      Pay Out-of-Pocket
                    </h3>
                    <span className="text-xs md:text-sm text-gray-600 font-medium flex items-center transition-transform" 
                          style={{ fontFamily: 'var(--font-inter)' }}>
                      {expandedCard === 'cash_pay' ? 'Show Less' : 'Learn More'}
                      <ChevronRight className={`inline w-3 md:w-4 h-3 md:h-4 ml-1 transition-transform duration-300 ${expandedCard === 'cash_pay' ? 'rotate-90' : ''}`} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-600 text-xs md:text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                      Graduate Therapists
                    </p>
                    <span className="inline-block rounded-full bg-yellow-100 text-gray-800 px-2 py-0.5 text-[11px] md:text-xs font-medium">
                      $30 per session
                    </span>
                  </div>
                </button>
                
                {/* Expanded Cash Pay Content */}
                <div className={`bg-white border-l border-r border-b border-yellow-200 rounded-b-2xl transition-all duration-700 ease-in-out overflow-hidden ${
                  expandedCard === 'cash_pay' 
                    ? 'max-h-[1000px] opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}>
                  <div className="p-5 space-y-4 pb-6">
                     
                     <div>
                       <p className="text-sm font-medium text-gray-800 mb-2">States we currently serve:</p>
                       <p className="text-sm text-gray-600">
                         {featuredStates.map(stateCode => {
                           const state = allStates.find(s => s.code === stateCode);
                           return state?.name;
                         }).join(', ')}
                       </p>
                     </div>
                     
                     <div>
                       <p className="text-sm font-medium text-gray-800 mb-2">What to expect:</p>
                       <ul className="text-sm text-gray-600 space-y-1">
                         <li>• 1-1 virtual sessions (45 min)</li>
                         <li>• You pay $30 per session—no hidden fees.</li>
                         <li>• You'll be matched with a Graduate Therapist. Graduate Therapists are in their counseling programs obtaining clinical hours under licensed supervision.</li>
                       </ul>
                     </div>
                     
                     <Button
                       onClick={() => handlePaymentSelection("cash_pay")}
                       className="w-full bg-yellow-300 hover:bg-yellow-400 text-gray-800 py-3"
                     >
                       Select Cash Pay Option
                     </Button>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>
     );
  }

  // State Selection Screen (Step 4)
  if (currentStep === 5) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with image */}
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={handleBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
            <img
              src="/sol-health-logo.svg"
              alt="Sol Health"
              className="h-5 w-auto"
            />
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-12">
          <div className="flow-narrow w-full mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl mb-3 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                What State Are You In?
              </h1>
            </div>

            {/* Featured States */}
            <div className="space-y-3 mb-6">
              {featuredStates.map((stateCode) => {
                const stateName = allStates.find(s => s.code === stateCode)?.name || stateCode;
                return (
                  <button
                    key={stateCode}
                    onClick={() => handleStateSelection(stateCode)}
                    className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
                      selectedState === stateCode
                        ? 'border-[#5C3106] text-white shadow-lg' 
                        : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                    }`}
                    style={{
                      backgroundColor: selectedState === stateCode ? '#5C3106' : 'white'
                    }}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center ${selectedState === stateCode ? '' : 'opacity-60'}`}>
                      <img 
                        src={`/state-icons/${stateCode.toLowerCase()}.svg`}
                        alt={stateName}
                        className="w-6 h-6"
                        style={{
                          filter: selectedState === stateCode ? 'brightness(0) invert(1)' : 'none'
                        }}
                        onError={(e) => {
                          e.currentTarget.src = '/state-icons/default.svg';
                        }}
                      />
                    </div>
                    
                    <span className={`text-base font-medium flex-1 text-center ${selectedState === stateCode ? 'text-white' : 'text-gray-800'}`}>
                      {stateName}
                    </span>
                    
                    <div className="w-8 h-8 flex items-center justify-center">
                      {selectedState === stateCode && (
                        <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
                          <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Other State Option */}
              <button
                onClick={() => setShowOtherStateInput(!showOtherStateInput)}
                className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
                  showOtherStateInput
                    ? 'border-[#5C3106] bg-[#5C3106] text-white shadow-lg' 
                    : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                }`}
              >
                <div className="w-8 h-8"></div>
                
                <span className={`text-base font-medium flex-1 text-center ${showOtherStateInput ? 'text-white' : 'text-gray-800'}`}>
                  Other State
                </span>
                
                <div className="w-8 h-8 flex items-center justify-center">
                  {showOtherStateInput && (
                    <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
                      <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Other State Input */}
            {showOtherStateInput && (
              <div className="mb-6 space-y-3 border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="text"
                  value={otherStateSearch}
                  onChange={(e) => setOtherStateSearch(e.target.value)}
                  onFocus={() => setIsOtherInputFocused(true)}
                  onBlur={() => setIsOtherInputFocused(false)}
                  placeholder="Start typing your state..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center"
                  style={{ fontFamily: 'var(--font-inter)' }}
                />
                
                {otherStateSearch && filteredStates.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {filteredStates.slice(0, 5).map((state) => (
                      <button
                        key={state.code}
                        onClick={() => handleStateSelection(state.code)}
                        className={`w-full text-left p-2 rounded hover:bg-gray-100 text-sm ${
                          selectedState === state.code ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                        }`}
                      >
                        {state.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Continue Button */}
            {selectedState && (
              <Button
                onClick={handleStateConfirm}
                className="w-full py-3 px-6 rounded-full text-base font-medium transition-colors duration-200 bg-blue-100 text-gray-800 hover:bg-blue-200"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Continue
                <ChevronRight className="inline w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Waitlist Popup */}
        {showWaitlistPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-4">We're expanding to {waitlistState}!</h3>
                <p className="text-gray-600 mb-6">
                  We're not yet available in {waitlistState}, but we're expanding quickly. 
                  Join our waitlist to be notified when we launch in your state.
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setShowWaitlistPopup(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      // Handle waitlist signup
                      window.open('https://solhealth.co/waitlist', '_blank');
                      setShowWaitlistPopup(false);
                    }}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Join Waitlist
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // NJ Insurance Plan Verification Screen (Step 6)
  if (currentStep === 6) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with image */}
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={() => setCurrentStep(5)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center">
          <img
              src="/sol-health-logo.svg"
              alt="Sol Health"
              className="h-5 w-auto"
            />
          </div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-6 pb-12">
          <div className="flow-narrow w-full -mt-12 mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl mb-3 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                Is Your Health Plan From New Jersey?
              </h1>
            </div>

            {/* State Options */}
            <div className="space-y-3 mb-6">
              {/* Yes, NJ Plan */}
              <button
                onClick={() => setNjInsurancePlan('yes')}
                className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
                  njInsurancePlan === 'yes'
                    ? 'border-[#5C3106] text-white shadow-lg' 
                    : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: njInsurancePlan === 'yes' ? '#5C3106' : 'white'
                }}
              >
                <div className={`w-8 h-8 flex items-center justify-center ${njInsurancePlan === 'yes' ? '' : 'opacity-60'}`}>
                  <img 
                    src="/state-icons/nj.svg"
                    alt="New Jersey"
                    className="w-6 h-6"
                    style={{
                      filter: njInsurancePlan === 'yes' ? 'brightness(0) invert(1)' : 'none'
                    }}
                  />
                </div>
                
                <span className={`text-base font-medium flex-1 text-center ${njInsurancePlan === 'yes' ? 'text-white' : 'text-gray-800'}`}>
                  Yes, I have a New Jersey plan
                </span>
                
                <div className="w-8 h-8 flex items-center justify-center">
                  {njInsurancePlan === 'yes' && (
                    <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
                      <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
                    </div>
                  )}
                </div>
              </button>

              {/* No, Different State */}
              <button
                onClick={() => setNjInsurancePlan('no')}
                className={`w-full py-4 px-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between transform hover:scale-[1.01] ${
                  njInsurancePlan === 'no'
                    ? 'border-[#5C3106] text-white shadow-lg' 
                    : 'bg-white border-gray-300 hover:border-gray-400 hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: njInsurancePlan === 'no' ? '#5C3106' : 'white'
                }}
              >
                <div className="w-8 h-8"></div>
                
                <span className={`text-base font-medium flex-1 text-center ${njInsurancePlan === 'no' ? 'text-white' : 'text-gray-800'}`}>
                  No, my plan is in a different state
                </span>
                
                <div className="w-8 h-8 flex items-center justify-center">
                  {njInsurancePlan === 'no' && (
                    <div className="bg-white rounded-full p-1 animate-in zoom-in-50 duration-300">
                      <Check className="w-4 h-4" style={{ color: '#5C3106' }} />
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Show options based on selection */}
            {njInsurancePlan === 'yes' && (
              <Button
                onClick={() => {
                  // Set state to NJ and go to insurance form
                  setFormData(prev => ({ ...prev, state: 'NJ' }));
                  setCurrentStep(7);
                }}
                className="w-full py-3 px-6 rounded-full text-base font-medium transition-colors duration-200 bg-blue-100 text-gray-800 hover:bg-blue-200"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Verify my insurance benefits
                <ChevronRight className="inline w-4 h-4 ml-2" />
              </Button>
            )}

            {njInsurancePlan === 'no' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-6 space-y-4">
                <div className="text-center px-2">
                  <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                    We're currently only accepting NJ insurance plans, but we're expanding quickly to other states.
                  </p>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    We offer care for $30/session out-of-pocket where you'll be matched to an intern-therapist.
                  </p>
                </div>
                
                <Button
                  onClick={() => {
                    // Switch to cash pay flow
                    setCurrentStep(5); // Go to state selection
                  }}
                  className="w-full py-3 px-4 md:px-6 rounded-full text-sm md:text-base font-medium transition-colors duration-200 bg-yellow-100 text-gray-800 hover:bg-yellow-200"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  <span className="block md:hidden">Choose $30/Session Out-Of-Pocket</span>
                  <span className="hidden md:block">Choose $30 Per Session Out-Of-Pocket</span>
                  <ChevronRight className="inline w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Insurance Form Screen (Step 6)
  if (currentStep === 7) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FFFBF3' }}>
        {/* Header with image */}
        <div className="relative h-20 md:h-24 overflow-hidden flex-shrink-0">
          <img 
            src="/onboarding-banner.jpg" 
            alt="" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-orange-50/50"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-center text-lg sm:text-xl md:text-2xl text-gray-800 font-normal" 
                style={{ 
                  fontFamily: "'Very Vogue Text', 'Playfair Display', Georgia, serif",
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                  lineHeight: '1.1'
                }}>
              CHANGE CAN BE SUNSHINE<br/>IF YOU LET IT IN
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0">
          <button onClick={() => setCurrentStep(6)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="w-10"></div>
          <div className="w-10"></div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-6 pb-14">
          <div className="flow-narrow w-full -mt-6 sm:-mt-8 mx-auto">
            <div className="text-center mb-8 flow-narrow mx-auto">
              <h1 className="text-2xl sm:text-3xl md:text-4xl mb-4 text-gray-800" 
                  style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif', lineHeight: '1.1' }}>
                Great, We're In Network!
              </h1>
              <p className="text-gray-600 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
                Next, to verify your eligibility and estimate your co-pay, please enter your insurance information below.
              </p>
            </div>

            {/* Form - Only show when in form or verifying state */}
            {(verificationStep === 'form' || verificationStep === 'verifying') && (
              <div className="space-y-6 mb-8 flow-narrow mx-auto">
                {/* Insurance Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Insurance Provider*
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106]"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    <option value="">Select provider</option>
                    {insuranceProviders.map((provider) => (
                      <option key={provider.id} value={provider.name}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Legal Name Row (md+ two columns) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Legal First Name - Pre-filled from earlier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Legal First Name*
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={verificationStep === 'verifying'}
                      className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106] text-base sm:text-lg"
                      style={{ fontFamily: 'var(--font-inter)' }}
                      placeholder="John"
                    />
                  </div>

                  {/* Legal Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Legal Last Name*
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={verificationStep === 'verifying'}
                      className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106] text-base sm:text-lg"
                      style={{ fontFamily: 'var(--font-inter)' }}
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="flow-narrow">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth*
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106]"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  />
                </div>

                {/* Member ID */}
                <div className="flow-narrow">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member ID*
                  </label>
                  <input
                    type="text"
                    value={formData.memberId}
                    onChange={(e) => handleInputChange('memberId', e.target.value)}
                    disabled={verificationStep === 'verifying'}
                    className="w-full p-2.5 sm:p-3 border border-[#5C3106] rounded-lg focus:border-gray-600 focus:outline-none bg-white text-gray-700 text-center disabled:opacity-50 shadow-[1px_1px_0_#5C3106]"
                    style={{ fontFamily: 'var(--font-inter)' }}
                    placeholder="Enter your member ID"
                  />
                </div>

{/* Email already collected in earlier step - no need to show again */}

                {/* Display preferred name info */}
                {formData.preferredName && formData.preferredName !== formData.firstName && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800 text-center">
                      <strong>Note:</strong> Your therapist will address you as "{formData.preferredName}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Compact form summary when verification is successful or failed */}
            {(verificationStep === 'success' || verificationStep === 'failed') && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Provider:</span>
                    <p className="font-medium">{selectedProvider}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Member ID:</span>
                    <p className="font-medium">{formData.memberId}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">DOB:</span>
                    <p className="font-medium">{formData.dateOfBirth}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Verification States */}
            {verificationStep === 'form' && (
              <Button
                onClick={handleInsuranceVerification}
                disabled={!selectedProvider || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.memberId}
                className={`flow-narrow mx-auto w-full py-5 px-8 rounded-full text-lg font-medium transition-colors ${
                  selectedProvider && formData.firstName && formData.lastName && formData.dateOfBirth && formData.memberId
                    ? 'bg-amber-700 text-white hover:bg-amber-800' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                Verify Insurance
                <ChevronRight className="inline w-5 h-5 ml-2" />
              </Button>
            )}

            {verificationStep === 'verifying' && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Verifying Your Insurance...</h3>
                <p className="text-sm text-gray-600">This usually takes just a few seconds...</p>
              </div>
            )}

            {verificationStep === 'success' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">You're Covered!</h3>
                  {verificationResponse?.benefits && (
                    <>
                      {/* Green Box - Main Benefits Display */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="text-green-800">
                          <p className="font-medium text-base mb-2">
                            {getBenefitsDisplay(verificationResponse.benefits, tradingPartnerServiceIdMap[selectedProvider as keyof typeof tradingPartnerServiceIdMap]).largeText}
                          </p>
                          <p className="text-sm text-green-700">
                            {getBenefitsDisplay(verificationResponse.benefits, tradingPartnerServiceIdMap[selectedProvider as keyof typeof tradingPartnerServiceIdMap]).smallText}
                          </p>
                        </div>
                      </div>

                      {/* Yellow Box - Additional Details (if applicable) */}
                      {getBenefitsDisplay(verificationResponse.benefits, tradingPartnerServiceIdMap[selectedProvider as keyof typeof tradingPartnerServiceIdMap]).additionalDetails && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="text-yellow-800">
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                              {getBenefitsDisplay(verificationResponse.benefits, tradingPartnerServiceIdMap[selectedProvider as keyof typeof tradingPartnerServiceIdMap]).additionalDetails}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <Button
                  onClick={handleInsuranceComplete}
                  className="w-full py-5 px-8 rounded-full text-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                  style={{ fontFamily: 'var(--font-inter)' }}
                >
                  Continue to Questionnaire
                  <ChevronRight className="inline w-5 h-5 ml-2" />
                </Button>
              </div>
            )}

            {verificationStep === 'failed' && (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Verification Failed</h3>
                  <p className="text-sm text-gray-600">Please check your information and try again.</p>
                </div>
                
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setVerificationStep('form')}
                    variant="outline"
                    className="flex-1 py-3 px-4 rounded-full border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(5)} // Go to cash pay flow (state selection)
                    className="flex-1 py-3 px-4 rounded-full bg-yellow-100 text-gray-800 hover:bg-yellow-200"
                    style={{ fontFamily: 'var(--font-inter)' }}
                  >
                    Pay $30/Session
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}