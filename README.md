# Sol Health Payment Flow

A comprehensive Next.js application that facilitates therapy session booking and payment processing for Sol Health, featuring insurance verification, therapist matching, and integrated payment systems.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Core Systems](#core-systems)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)

## Overview

Sol Health FE is a full-stack web application built with Next.js that streamlines the process of connecting clients with therapists. The application handles the complete user journey from initial onboarding through appointment booking.

### Core User Flow

1. **Onboarding** - User provides basic information and selects payment type (insurance or cash pay)
2. **Insurance Verification** - Real-time insurance benefit verification for insurance clients
3. **Therapy Assessment** - Comprehensive mental health screening and preference collection
4. **Therapist Matching** - Algorithm-based matching with available therapists
5. **Appointment Booking** - Calendar integration with timezone-aware scheduling
7. **IntakeQ Integration** - Automated client profile creation and form delivery

## Architecture

The application follows a modern Next.js App Router architecture with the following key characteristics:

- **Frontend**: React with TypeScript, styled with Tailwind CSS and shadcn/ui components
- **Backend**: Next.js API routes handling business logic and external integrations
- **State Management**: React Context API with custom hooks for complex state
- **Data Flow**: Comprehensive SuperJson data structure for tracking user journey
- **External Integrations**: Insurance verification, therapist APIs, payment processing, and client management

## Key Features

### 🔐 Insurance Verification
- Real-time insurance benefit verification via Nirvana API
- Automatic copay, deductible, and coinsurance calculation
- Support for major insurance providers
- Detailed benefit breakdown and cost estimation

### 🧠 Therapist Matching
- Advanced matching algorithm based on:
  - Geographic location and state licensing
  - Therapeutic specializations and approaches
  - Gender preferences and lived experiences
  - Payment type compatibility (insurance vs cash pay)
  - Session availability

### 📅 Appointment Scheduling
- Timezone-aware calendar integration
- Real-time availability checking
- Automated email confirmations
- Different session durations based on therapist type:
  - Associate Therapists: 55-minute sessions
  - Graduate Therapists: 45-minute sessions

### 💳 Payment Processing
- Integrated payment flow for cash pay clients
- Secure payment handling and processing
- Payment validation and fraud detection

### 📋 Client Management
- IntakeQ integration for comprehensive client profiles
- Automatic mandatory form delivery
- Insurance data mapping to client records
- Complete journey tracking and analytics

### 🎯 Mental Health Assessment
- PHQ-9 depression screening
- GAD-7 anxiety assessment
- Automated scoring and risk assessment
- Therapist preference collection

## Tech Stack

### Frontend
- **Next.js 15.3** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library
- **Lucide React** - Icon library

### Backend & APIs
- **Next.js API Routes** - Server-side logic
- **Axios** - HTTP client for external APIs
- **IntakeQ API** - Client management
- **Custom Therapist API** - Matching and availability

### Development Tools
- **Biome** - Code formatting and linting
- **ESLint** - Additional linting rules
- **PostCSS** - CSS processing
- **TypeScript** - Static type checking

## Project Structure

```
solPaymentFlow/
├── solPayments/                 # Main Next.js application
│   ├── src/
│   │   ├── app/                # App Router pages and API routes
│   │   │   ├── api/           # Backend API endpoints
│   │   │   │   ├── payments/  # Payment processing
│   │   │   │   ├── check-client/ # Client verification
│   │   │   │   └── survey/    # Survey submission
│   │   │   ├── booking/       # Booking confirmation pages
│   │   │   ├── payment/       # Payment flow pages
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Home page
│   │   │   └── mainpageComponent.tsx # Main app logic
│   │   ├── components/        # React components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── CustomSurvey.tsx      # Mental health assessment
│   │   │   ├── OnboardingFlow.tsx    # User onboarding
│   │   │   ├── MatchedTherapist.tsx  # Therapist selection
│   │   │   ├── LoadingScreen.tsx     # Loading states
│   │   │   └── InsuranceVerificationModal.tsx
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility libraries
│   │   ├── providers/        # Context providers
│   │   ├── services/         # Business logic services
│   │   ├── types/            # TypeScript definitions
│   │   └── utils/            # Helper functions
│   ├── public/               # Static assets
│   ├── scripts/              # Build and deployment scripts
│   ├── package.json          # Dependencies and scripts
│   ├── next.config.js        # Next.js configuration
│   ├── tailwind.config.ts    # Tailwind CSS configuration
│   └── tsconfig.json         # TypeScript configuration
├── .env                      # Environment variables
├── .gitignore               # Git ignore rules
├── FONT_STANDARDS.md        # Typography guidelines
└── README.md                # This file
```

## Core Systems

### 1. Onboarding System (`OnboardingFlow.tsx`)
Handles initial user data collection including:
- Personal information (name, email, state)
- Payment type selection (insurance vs cash pay)
- Insurance verification for insurance clients
- "What brings you to therapy" context collection

### 2. Mental Health Assessment (`CustomSurvey.tsx`)
Comprehensive screening system featuring:
- **PHQ-9 Depression Scale**: 9-question assessment with automatic scoring
- **GAD-7 Anxiety Scale**: 7-question anxiety screening
- **Demographic Collection**: Age, gender, race/ethnicity, location
- **Therapist Preferences**: Gender, specializations, lived experiences
- **Substance Use Screening**: Alcohol and recreational drug frequency
- **Safety Screening**: Crisis assessment and risk evaluation

### 3. Therapist Matching Engine
Algorithm-based matching system that considers:
- **Geographic Licensing**: Therapist must be licensed in client's state
- **Payment Compatibility**: Insurance vs cash pay therapist availability
- **Specialization Matching**: Anxiety, depression, LGBTQ+, trauma, etc.
- **Preference Alignment**: Gender, therapeutic approach, lived experiences
- **Session Availability**: Real-time calendar integration
- **Clinical Appropriateness**: Matching client needs with therapist expertise

### 4. Insurance Verification System
Real-time benefit verification featuring:
- **Nirvana API Integration**: Professional insurance verification service
- **Comprehensive Benefit Analysis**:
  - Copayment amounts
  - Deductible status and remaining amounts
  - Coinsurance percentages
  - Out-of-pocket maximums
  - Mental health coverage specifics
- **Session Cost Calculation**: Pre and post-deductible member obligations
- **Telehealth Benefits**: Specific telehealth coverage and costs

### 5. Appointment Booking System
Timezone-aware scheduling with:
- **Multi-Timezone Support**: Automatic conversion between client and therapist timezones
- **Real-Time Availability**: Live calendar integration
- **Session Duration Logic**:
  - Associate Therapists (Limited Permit): 55 minutes
  - Graduate Therapists (MHC/MSW/MFT): 45 minutes
- **Automated Notifications**: Email confirmations with calendar invites
- **Booking Confirmation**: Comprehensive confirmation page with next steps

### 6. Payment Processing System
Secure payment handling with:
- **Integrated Payment Flow**: Seamless payment processing for cash pay clients
- **Payment Validation**: Amount limits and fraud detection
- **Secure Processing**: Industry-standard security practices

### 7. Client Management Integration
IntakeQ system integration featuring:
- **Automatic Profile Creation**: Complete client records in IntakeQ
- **Insurance Data Mapping**: Comprehensive insurance information transfer
- **Mandatory Form Delivery**: Automated new client paperwork
- **Therapist-Specific Routing**: Different IntakeQ instances based on therapist type
- **Client Portal Setup**: Automated portal access configuration

### 8. Data Management (`superJsonBuilder.ts`)
Comprehensive data structure management:
- **Journey Tracking**: Complete user flow from start to booking
- **State Management**: Centralized data store for user information
- **Backend Synchronization**: Automatic Google Sheets logging
- **Milestone Tracking**: Key journey points (onboarding, survey, matching, booking)
- **Data Enrichment**: Progressive data collection and enhancement

## Configuration

### Environment Variables

The application requires several environment variables for proper operation:

```env
# External APIs
NIRVANA_API_KEY=your_insurance_verification_key
INTAKEQ_API_KEY=your_intakeq_api_key
THERAPIST_API_ENDPOINT=your_therapist_matching_api

# Application
NEXT_PUBLIC_APP_URL=your_app_url
NEXTAUTH_SECRET=your_auth_secret
```

### Next.js Configuration (`next.config.js`)

Key configuration includes:
- **Image Optimization**: Configured for external image domains
- **CORS Settings**: Proper cross-origin request handling
- **Development Server**: Configured for Railway deployment
- **Asset Optimization**: Unoptimized images for static export compatibility

### Tailwind Configuration (`tailwind.config.ts`)

Custom design system featuring:
- **Color Palette**: Warm, therapy-focused color scheme
- **Typography**: Inter font family with custom font loading
- **Component Styling**: shadcn/ui integration
- **Responsive Design**: Mobile-first responsive breakpoints

## Development

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone [repository-url]
   cd solPaymentFlow
   ```

2. **Install dependencies:**
   ```bash
   cd solPayments
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

### Available Scripts

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build           # Build for production
npm run start           # Start production server

# Code Quality
npm run lint            # TypeScript checking and ESLint
npm run format          # Format code with Biome
```

### Development Workflow

1. **Feature Development**: Create feature branches from main
2. **Code Quality**: Use Biome for formatting and linting
3. **Type Safety**: Ensure TypeScript compliance
4. **Component Testing**: Test components in isolation
5. **Integration Testing**: Test complete user flows
6. **Performance**: Monitor bundle size and loading times

### Key Development Considerations

- **Timezone Handling**: Always use the centralized timezone utilities
- **State Management**: Follow the SuperJson pattern for data consistency
- **Error Handling**: Implement comprehensive error boundaries
- **Loading States**: Provide meaningful loading indicators
- **Accessibility**: Ensure WCAG compliance for all interactions
- **Mobile Optimization**: Test thoroughly on mobile devices

## Deployment

### Railway Deployment

The application is configured for Railway deployment with:

- **Railway Configuration** (`railway.toml`):
  ```toml
  [build]
  builder = "nixpacks"

  [deploy]
  startCommand = "npm start"
  ```

- **Environment Setup**: Configure all required environment variables in Railway dashboard
- **Database**: Ensure database connections are properly configured
- **Domain**: Configure custom domain if needed

### Production Considerations

1. **Environment Variables**: Ensure all production API keys are set
2. **Database**: Configure production database connections
3. **Monitoring**: Set up error tracking and performance monitoring
4. **Security**: Enable HTTPS and proper CORS settings
5. **Backup**: Implement regular data backup procedures
6. **Scaling**: Configure auto-scaling based on traffic

### Performance Optimization

- **Image Optimization**: Configure Next.js image optimization
- **Bundle Analysis**: Regular bundle size monitoring
- **Caching**: Implement appropriate caching strategies
- **CDN**: Use CDN for static assets
- **Database Optimization**: Optimize database queries and indexes

## Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Standards

- Follow TypeScript best practices
- Use Biome for code formatting
- Ensure comprehensive error handling
- Write meaningful commit messages
- Add comments for complex business logic
- Test all user-facing features

---

For questions or support, contact the development team or refer to the project documentation.