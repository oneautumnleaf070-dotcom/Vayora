# Implementation Plan — Login Portals & Authentication Suite

**Objective:** Enhance admin & logistics authentication with clear error messaging, onboarding flows, and mobile-optimized UX.

---

## Pages to Create/Enhance

### 1. ADMIN LOGIN PAGE (Enhance)
**File:** `src/pages/admin/AdminLoginPage.tsx`

**Features:**
- Title: "VAYORA Control Center — Administrator Sign In"
- Subtitle: "Restricted Access — Governance & Oversight"
- Phone number input with +91 country code
- reCAPTCHA integration
- OTP entry screen (6-digit) with countdown timer
- **Enhanced Error Messages:**
  - "This phone is not registered as admin" → "Contact super-admin to request access" + support link
  - "Invalid OTP" → "2 attempts remaining" (locked after 3 failed)
  - Network errors with retry button
- Success → redirect to `/admin/dashboard` or `/admin/profile` (if first login)

---

### 2. LOGISTICS LOGIN PAGE (Enhance)
**File:** `src/pages/logistics/LogisticsLoginPage.tsx`

**Features:**
- Title: "VAYORA Logistics — Partner Sign In"
- Subtitle: "Delivery & Route Management"
- Same OTP flow as admin
- **Enhanced Error Messages:**
  - "Not registered as logistics partner" → "Register as new partner" link
  - "Account pending admin approval" → "Check status" link + application timestamp
- Success → redirect to `/logistics/dashboard`

---

### 3. NEW: LOGISTICS REGISTRATION PAGE
**File:** `src/pages/logistics/LogisticsRegistrationPage.tsx`
**Route:** `/logistics/register`

**Multi-Step Form (4 Steps):**

**Step 1: Contact & Vehicle Info**
- Full Name *
- Phone (with OTP verification) *
- Email *
- Vehicle Type (dropdown: 2-wheeler, auto, truck, van) *
- Vehicle Capacity (kg/tonnes) *
- Vehicle Registration Number *
- Progress bar: 1/4

**Step 2: Location & Service Area**
- Current Location (map picker or address search) *
- Service Area (dropdown: city/region) *
- Languages Spoken (checkboxes: Hindi, English, Marathi, Tamil, etc) *
- Availability (Full-time, Part-time, Flexible) *
- Progress bar: 2/4

**Step 3: Documents & Verification**
- Upload ID Proof (Aadhar/DL) — file input, JPG/PNG, <5MB
- Upload Vehicle RC (Registration Certificate) — file input, <5MB
- Upload Insurance Document (optional) — file input, <5MB
- Agree to Terms & Conditions * (checkbox)
- Progress bar: 3/4

**Step 4: Review & Submit**
- Summary of all entered data (editable sections)
- "By submitting, you agree to VAYORA logistics terms"
- Submit button: "Request Approval"
- Success: "Application submitted! You'll receive SMS updates"
- Progress bar: 4/4

**Features:**
- Save draft to localStorage (user can come back)
- Phone OTP verification before submission
- File validation (size, format, dimensions)
- Form validation with clear error messages
- Mobile-optimized file upload with preview

---

### 4. NEW: ADMIN REGISTRATION PAGE (Super-Admin Only)
**File:** `src/pages/admin/AdminRegistrationPage.tsx`
**Route:** `/admin/register` (only accessible if user is super-admin)

**Form:**
- Full Name *
- Phone Number *
- Email *
- Admin Role (dropdown: Super-Admin, Moderator, Support) *
- Permissions (checkboxes): Manage Users, Resolve Disputes, Settle Payments, View Analytics
- Agree to Admin Agreement * (checkbox)

**Submission:**
- Send invitation SMS: "You've been invited as VAYORA Admin. Verify here: [link]"
- Link expires in 7 days
- New admin must verify phone + optional password setup
- Status page shows "Invitation sent" and timestamp

---

### 5. NEW: OTP INPUT COMPONENT (Reusable)
**File:** `src/components/auth/OtpInput.tsx`

**Features:**
- 6 individual digit inputs (auto-focus next, backspace clears)
- Numeric keyboard on mobile
- Countdown timer display: "Code expires in 4:45"
- Resend button (disabled for 30s after send)
- Paste support (auto-splits 6 digits)
- ARIA labels for accessibility

---

### 6. NEW: FILE UPLOAD COMPONENT (Reusable)
**File:** `src/components/auth/FileUploadInput.tsx`

**Features:**
- Click-to-upload + drag-and-drop
- File type validation (JPG, PNG only)
- File size validation (<5MB)
- Image preview (thumbnail)
- Clear button (remove selected file)
- Loading state during upload
- Error messages for invalid files

---

### 7. REGISTRATION SERVICE
**File:** `src/services/registrationService.ts`

**Functions:**
- `submitLogisticsRegistration(data)` — validate, upload docs to Firebase Storage, create user record with status "PENDING_APPROVAL"
- `submitAdminRegistration(data)` — super-admin invite flow, send SMS, create temporary invite link
- `verifyPhoneForRegistration(phone, otp)` — OTP verification during registration
- `getLogisticsApplicationStatus(phone)` — check if application pending/approved/rejected

---

## Enhancements Summary

| Component | Current | Enhanced |
|-----------|---------|----------|
| **Admin Login** | Basic OTP | Clear error messages + support links |
| **Logistics Login** | Basic OTP | Registration link + status check |
| **Auth Flow** | Single OTP screen | OTP input component + countdown timer |
| **Mobile** | Responsive | ≥48px touch targets, full-screen OTP |
| **Registration** | None | 4-step guided onboarding |
| **Documents** | N/A | Drag-drop upload + validation |
| **Error UX** | Generic | Contextual help + actionable next steps |

---

## Implementation Checklist

### Phase 1: Reusable Components (30 min)
- [ ] `OtpInput.tsx` — 6-digit input with timer
- [ ] `FileUploadInput.tsx` — drag-drop file upload with preview

### Phase 2: Auth Services (20 min)
- [ ] `registrationService.ts` — submit functions + validation

### Phase 3: Login Pages (20 min)
- [ ] Enhance `AdminLoginPage.tsx` — better error messaging
- [ ] Enhance `LogisticsLoginPage.tsx` — registration link

### Phase 4: Registration Pages (30 min)
- [ ] `LogisticsRegistrationPage.tsx` — 4-step form
- [ ] `AdminRegistrationPage.tsx` — super-admin invite

### Phase 5: Routing (10 min)
- [ ] `App.tsx` — register `/logistics/register` and `/admin/register`
- [ ] `Sidebar.tsx` — add navigation if needed

### Phase 6: Testing & Build (10 min)
- [ ] Build verification
- [ ] Lint check
- [ ] Manual test on mobile + desktop

**Estimated Total Time:** ~2 hours

---

## Approval Checklist

- [ ] OTP input component ready
- [ ] File upload component ready
- [ ] Registration flows complete
- [ ] Error messaging contextual
- [ ] Mobile-optimized
- [ ] Build: 0 errors
- [ ] Lint: 0 errors
- [ ] All routes registered

---

## Notes

- **Phone OTP:** Use existing Firebase Phone Auth (no changes)
- **File Storage:** Upload documents to `gs://vayora-prod/registrations/{uid}/{filename}`
- **Approval Workflow:** Admins review pending logistics applications at `/admin/users` (existing page)
- **Offline:** No offline support needed for registration
- **Accessibility:** ARIA labels on all form inputs, semantic HTML
- **i18n:** Support EN/HI labels where applicable

Ready to implement? 🚀
