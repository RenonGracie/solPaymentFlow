# Font Standards

## Standard Fonts Used
Throughout the application, we use only two fonts:

### 1. Inter (Body Text)
- **Usage**: All body text, form labels, buttons, descriptions, and general content
- **CSS Variable**: `var(--font-inter)`
- **Fallback**: System fonts
- **Common Properties**:
  - Font weights: 400 (normal), 500 (medium), 600 (semibold)
  - Line height: 1.4-1.6 for readability
  - Font sizes: 12px-18px typically

### 2. Very Vogue (Headers/Display)
- **Usage**: Main headings, hero text, decorative text, and brand messaging
- **CSS Variable**: `var(--font-very-vogue)`
- **Fallback**: `Georgia, serif`
- **Common Properties**:
  - Font weight: 400 (normal)
  - Line height: 1.1 for tight spacing
  - Letter spacing: 0.02em
  - Font sizes: 18px-48px typically

## Implementation Guidelines

### ✅ Correct Implementation
```jsx
// For body text
<p style={{ fontFamily: 'var(--font-inter)' }}>Content</p>

// For headings
<h1 style={{ fontFamily: 'var(--font-very-vogue), Georgia, serif' }}>Heading</h1>

// Using Tailwind classes (when available)
<div className="inter">Content</div>
```

### ❌ Avoid These Patterns
```jsx
// Don't use font names directly
<p style={{ fontFamily: 'Inter' }}>Wrong</p>
<h1 style={{ fontFamily: 'Very Vogue Text' }}>Wrong</h1>

// Don't use inconsistent class names
<div className="font-inter">Wrong</div>
```

## Files Audited and Fixed
- ✅ OnboardingFlow.tsx - Fixed 'Very Vogue Text' references
- ✅ CustomSurvey.tsx - Fixed 'Very Vogue Text' references  
- ✅ mainpageComponent.tsx - Already consistent
- ✅ MatchedTherapist.tsx - Already consistent
- ✅ LoadingScreen.tsx - Already consistent
- ✅ InsuranceVerificationModal.tsx - Fixed 'font-inter' class usage
- ✅ TypeformEmbed.tsx - Fixed 'Very Vogue Text' reference

## Notes
- Always include fallback fonts for Very Vogue: `'var(--font-very-vogue), Georgia, serif'`
- Use CSS variables for consistent theming across the application
- Maintain consistent line heights and spacing for visual harmony