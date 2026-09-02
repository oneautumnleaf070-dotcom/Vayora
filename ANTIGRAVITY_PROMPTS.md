# VAYORA Enhancement Prompts for Antigravity

**Project Path:** `C:\Users\DELL\OneDrive\VAYORA\`  
**Dev Server:** `http://localhost:5173/`  
**Firebase:** Configured via `.env.example`  

---

## QUICK REFERENCE: Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **State:** Context API (Auth, Language, Toast)
- **Database:** Firestore with security rules (RBAC enforced)
- **Auth:** Firebase Phone OTP
- **UI:** Lucide React, Recharts, Leaflet Maps
- **Roles:** FARMER, FPO, BUYER, LOGISTICS, ADMIN

---

## PROMPT 1: Code Analysis, Bug Detection & Optimization

```
You are working on VAYORA, a Firebase-backed React/TypeScript agricultural marketplace.
Project path: C:\Users\DELL\OneDrive\VAYORA\

TASK: Comprehensive Code Review & Bug Detection

SCOPE:
1. **Security & Correctness Audit**
   - Review firestore.rules: check for RBAC gaps, privilege escalation, race conditions
   - Audit src/context/AuthContext.tsx & src/components/layout/ProtectedRoute.tsx: 
     ensure role validation is bulletproof
   - Firestore queries in src/services/*.ts: check for N+1 queries, missing indexes
   - Payment flow in order/payment services: is settlement atomic? 
     Could concurrent orders cause double-charging or lost money?
   - OTP/QR verification in src/pages/logistics/DeliveryVerificationPage.tsx: 
     can they be replayed or forged?

2. **Code Quality Issues - Scan For:**
   - Empty catch blocks (error swallowing)
   - Unhandled promise rejections
   - Missing null checks on object properties
   - Implicit 'any' types in TypeScript
   - Firebase listener cleanup in useEffect (unsubscribe on unmount?)
   - Race conditions in concurrent state updates

3. **Performance Issues**
   - N+1 queries in dashboard data loads (FarmerDashboard, AdminDashboard, etc)
   - Missing useCallback/useMemo where needed
   - Firebase subscriptions not cleaned up properly
   - Unnecessary re-renders in list components

4. **Report Format - For Each Issue Found:**
   - Severity: CRITICAL (security/data loss), HIGH (major bugs), MEDIUM (UX/perf), LOW (polish)
   - File: src/path/to/file.tsx:line_number
   - Description: What is the issue?
   - Reproduction: Steps to trigger (if applicable)
   - Fix: Suggested code change
   
   If no critical/high issues found, confirm: "Code review passed - no security/correctness issues found."

INSTRUCTIONS:
- Do NOT make edits unless explicitly asked
- If you find issues, list them and wait for approval before fixing
- Focus on code that handles: authentication, payments, order state, role assignment, delivery verification
```

---

## PROMPT 2: Farmer/FPO Dashboard - UX Enhancement

```
You are redesigning the Farmer/FPO dashboard for VAYORA.

CURRENT STATE:
- File: src/pages/farmer/FarmerDashboard.tsx
- Shows: Stat cards (produce count, pending offers, earnings), recent offers, AI price recommendations
- Issues: Unclear produce status, scattered actions, mobile layout needs work

TASK: Redesign for clarity, mobile-friendliness, and farmer actionability

PROBLEMS TO SOLVE:
1. Farmers don't know at a glance:
   - Which produce is ACTIVE vs EXPIRED vs DRAFT
   - Which offers are high-value/priority
   - How their earnings are calculated (need fee breakdown)

2. Too many scattered actions:
   - "Add New Produce" button placement unclear
   - "View All Offers/Orders/Earnings" links buried
   - Mobile view lacks clear visual hierarchy

3. AI Intelligence could be clearer:
   - Show 7-day price trend vs mandi benchmark
   - Indicate demand forecast confidence
   - "Recommended action: HOLD or SELL NOW"

4. Mobile UX fails on:
   - Stat cards stack poorly (<768px)
   - Offer cards too wide to scroll smoothly
   - Chart responsiveness not tested

DESIGN REQUIREMENTS:
- Maintain Vayora green (#16a34a) brand colors
- Mobile-first approach (375px viewport test required)
- All new components must be TypeScript with proper typing
- Use Tailwind CSS only (no inline styles)
- All interactive elements need loading/error states

LAYOUT STRUCTURE (Desktop + Mobile Responsive):

Top Section: KPI Summary Bar
├─ Total Earnings (₹)
├─ Active Listings (count)
├─ Pending Offers (count)
└─ Quick Actions: [+ Add Listing] [View All Offers] [Analytics]

Middle Section: Produce Status Tabs
├─ ACTIVE Produce (show grid/list toggle)
│  ├─ Produce card: image, name, quantity, price, status
│  └─ Quick actions: Edit, Delist, View Offers on This
├─ DRAFT Produce
└─ EXPIRED / SOLD_OUT

Lower Section: Offers & Orders
├─ Top Pending Offers (5 rows)
│  ├─ Offer: crop name, quantity, offered price, buyer name
│  └─ Inline actions: Accept [green], Counter [blue], Reject [gray]
└─ Recent Orders (3 rows): status, buyer, amount, date

Bottom Section: AI Intelligence
├─ 7-Day Price Forecast Chart
├─ Demand Level Indicator
└─ Recommended Action (sell now / hold / wait for peak price)

DELIVERABLES:
1. Redesigned FarmerDashboard.tsx (component code)
2. New sub-components if needed:
   - ProduceStatusCard.tsx (display produce with quick edit)
   - OfferSummaryRow.tsx (offer with inline accept/counter/reject)
   - PriceForecastWidget.tsx (7-day forecast + recommendation)
3. Mobile-responsive Tailwind classes (test @375px, @768px, @1024px)
4. All TypeScript types properly defined
5. Loading/error states for all data fetches
6. Accessibility: ARIA labels, semantic HTML

MAINTAIN:
- Current Firestore collections & security rules (do NOT change)
- Existing color scheme and logo
- Firebase authentication flow
- API endpoints and service functions

DO NOT:
- Rename or delete existing components without asking
- Add new Firestore collections without permission
- Modify user schema or order schema
- Remove any existing features (just improve them)

BEFORE MAKING CHANGES:
- Confirm the layout structure above meets requirements
- Test on mobile (use Chrome DevTools 375px viewport)
- Ensure all buttons/links are accessible (keyboard navigation)
```

---

## PROMPT 3: Admin Control Center - Dashboard & Management

```
You are building the Admin Control Center for VAYORA.

CURRENT STATE:
- Files: src/pages/admin/AdminDashboard.tsx, AdminUsersPage.tsx, AdminUserDetailPage.tsx
- Issue: Minimal features, no analytics, no audit trail, no bulk actions

TASK: Build a professional admin dashboard with analytics, user management, and governance

SECTIONS REQUIRED:

1. ADMIN DASHBOARD (Analytics Overview)
   - Metrics cards (KPIs):
     └─ Total Users (by role: Farmer, FPO, Buyer, Logistics)
     └─ Active Produce Listings
     └─ Total Orders (this month)
     └─ Platform Revenue (commission collected)
     └─ Unverified Sellers (count, click to review)
   
   - Charts (using Recharts):
     └─ 30-Day User Growth (line chart: new farmers, buyers, logistics)
     └─ Order Volume Trend (bar chart: daily orders)
     └─ Top 10 Crops by Demand (horizontal bar)
     └─ Revenue Breakdown (pie: commissions, etc)
   
   - Alerts & Quick Actions:
     └─ Pending Seller Verifications (count)
     └─ Failed Deliveries (count)
     └─ Payment Disputes (count)
     └─ Quick button to each section

2. USER MANAGEMENT PAGE
   - Table: All users with columns
     └─ Name | Phone | Role | Status | Verified? | Registration Date | Actions
   
   - Search & Filters:
     └─ Search by name/phone
     └─ Filter by role (Farmer, FPO, Buyer, Logistics, Admin)
     └─ Filter by status (Active, Suspended, Unverified)
     └─ Filter by date range
   
   - Bulk Actions:
     └─ Select checkbox on each row
     └─ Bulk action buttons: Approve, Suspend, Change Role (with dropdown)
     └─ Show count of selected rows
   
   - Individual Actions (per user):
     └─ Click row → Detail page with options:
        - Approve/Reject (with reason text field)
        - Suspend/Unsuspend (with reason)
        - View Profile (name, phone, location, role, created date)
        - View Orders Made/Received (if buyer/farmer)
        - View Ratings & Reviews
        - View Verification Docs (if seller)

3. USER DETAIL PAGE (Enhanced)
   - Left side: User profile card
     └─ Avatar, Name, Phone, Role, Email, Location, Verified status
   
   - Center: Tabs
     └─ Profile: Basic info + edit (admin only)
     └─ Orders: Orders made or received (with status filters)
     └─ Ratings: Reviews from other users
     └─ Verification: Docs submitted, approval status
     └─ Action History: All admin actions on this user (suspend, role change, etc)
   
   - Right side: Admin actions
     └─ Approve Seller (if unverified)
     └─ Suspend User (with reason dropdown + custom text)
     └─ Change Role (dropdown + confirm)
     └─ Send Message / Notification

4. REPORTING & ANALYTICS PAGE
   - Export Options:
     └─ Export All Users (CSV)
     └─ Export All Orders (CSV with price breakdown)
     └─ Export Payment Transactions (CSV)
     └─ Export Delivery Records (CSV)
   
   - Report Filters:
     └─ Date range, role, status, region
   
   - Charts:
     └─ Seller verification timeline
     └─ Payment settlement status (pending vs settled)
     └─ Delivery success rate (delivered vs cancelled)

5. AUDIT LOG PAGE
   - Table: Admin action history
     └─ Timestamp | Admin Name | Action | Target User | Details
   
   - Actions tracked:
     └─ User approved/rejected
     └─ User role changed
     └─ User suspended
     └─ Price dispute resolved
     └─ Payment manually released
   
   - Filters:
     └─ Date range, admin, action type, target user

TECHNICAL REQUIREMENTS:
- Firestore queries with pagination (handle large user counts)
- Real-time listeners for new registrations (optional, if performance allows)
- CSV export functionality (use a library like papaparse or xlsx)
- All pages require ADMIN role (security check in ProtectedRoute)
- Mobile-responsive tables (collapsible on <768px)
- Loading states for all data fetches
- Error handling with user-friendly messages

NEW FILES TO CREATE:
- src/pages/admin/ReportingPage.tsx
- src/pages/admin/AuditLogPage.tsx (if admin actions aren't logged yet)
- src/services/adminService.ts (queries: getUsers, getUserDetail, getUserOrders, etc)
- src/components/admin/UserTable.tsx (reusable table with search/filter/bulk)

MAINTAIN:
- Firestore security rules (admin-only access)
- Existing user schema
- Color scheme (Vayora green)
- Do NOT add password-based auth or 2FA yet

DO NOT:
- Expose admin phone/email to regular users
- Allow non-admins to access these pages
- Delete user accounts (soft delete only, if at all)

BEFORE MAKING CHANGES:
- Confirm chart types (line, bar, pie, horizontal bar)
- Confirm CSV format expected (headers, date format, etc)
- Test pagination with 100+ users
- Test bulk actions (select 10 users, approve all in one click)
```

---

## PROMPT 4: Logistics Dashboard - Route & Delivery Optimization

```
You are building the Logistics Dashboard for VAYORA.

CURRENT STATE:
- Files: src/pages/logistics/LogisticsDashboard.tsx, DeliveryVerificationPage.tsx
- Existing: Basic delivery list, QR/OTP verification
- Issue: Route visualization missing, multi-supplier pickup unclear, mobile UX poor

TASK: Redesign logistics dashboard for route optimization, delivery clarity, and driver-friendly UX

SECTIONS REQUIRED:

1. LOGISTICS DASHBOARD (Assignment & Route Overview)
   - Delivery Status Tabs (clickable):
     └─ [PENDING_ASSIGNMENT] [ASSIGNED] [IN_TRANSIT] [DELIVERED] [CANCELLED]
   
   - Delivery List Card (for each tab):
     ├─ Order ID
     ├─ Pickup Location (city/address)
     ├─ Delivery Location (city/address)
     ├─ Distance (km)
     ├─ ETA (estimated arrival time)
     ├─ Waypoints count (if multi-supplier: "3 pickups")
     ├─ Status badge (color coded)
     └─ Click → Full Route Map & Verification

   - Map Preview (small, in list):
     └─ Show pickup → delivery route line
     └─ Click to expand full map view

   - KPI Cards at top:
     └─ Deliveries Today
     └─ On-Time Delivery Rate (%)
     └─ Earnings Today
     └─ Pending Verifications (count)

2. ROUTE DETAIL PAGE (Full Map & Navigation)
   - Full-screen Leaflet map showing:
     └─ Start location (pickup) with pin
     └─ All waypoints (multi-supplier) with numbered pins
     └─ End location (delivery) with destination pin
     └─ Optimized route line (connecting all)
   
   - Side panel (on desktop) or bottom drawer (mobile):
     ├─ Order details:
     │  ├─ Order ID, Buyer name, Crop, Quantity, Total Amount
     │  ├─ Pickup address (farmer name, phone, location)
     │  └─ Delivery address (buyer name, location)
     │
     ├─ Route info:
     │  ├─ Total distance: X km
     │  ├─ Total ETA: X min
     │  └─ Current waypoint (1/3)
     │
     ├─ Waypoint list (if multi-supplier):
     │  ├─ [1] Farmer A: 50kg, location, [Arrived] [Pick up]
     │  ├─ [2] Farmer B: 30kg, location, [Pending]
     │  └─ [3] Farmer C: 20kg, location, [Pending]
     │
     └─ Action buttons:
        ├─ [Navigate] (Google Maps / Apple Maps intent link)
        ├─ [Verify Delivery] (QR/OTP)
        └─ [Cancel Delivery] (with reason)

3. DELIVERY VERIFICATION PAGE (Enhanced)
   - Current flow (keep):
     └─ QR Scanner or Manual OTP Entry
     └─ Verify delivery
   
   - New additions:
     ├─ Photo Capture (for proof of delivery)
     │  ├─ Camera input (mobile camera intent)
     │  ├─ Preview & re-capture option
     │  └─ Upload to Firebase Storage
     │
     ├─ Signature Capture (optional, for B2B orders)
     │  ├─ Canvas signature pad
     │  ├─ Clear & Re-sign
     │  └─ Save as image
     │
     ├─ Condition Notes (optional):
     │  ├─ "Goods received in good condition"
     │  ├─ "Minor damage to X items" (free text)
     │  └─ Photos of damage (if any)
     │
     └─ Confirmation:
        ├─ Summary of delivery (buyer confirms receipt)
        ├─ Farmer & Logistics notified immediately
        └─ Payment settlement triggered

4. ANALYTICS & EARNINGS PAGE
   - KPI Cards:
     └─ Deliveries Completed (this month)
     └─ On-Time Rate (%)
     └─ Average Rating (⭐)
     └─ Total Earnings (₹)
   
   - Charts:
     └─ 30-Day delivery volume (bar chart)
     └─ Average delivery time vs expected (line chart)
     └─ Earnings breakdown (pie: orders, tips, bonuses)
     └─ Rating distribution (histogram: 5⭐, 4⭐, etc)
   
   - Delivery history table:
     └─ Date | Order ID | Distance | ETA vs Actual | Amount | Rating

TECHNICAL REQUIREMENTS:
- **Map Integration:** Leaflet + React-Leaflet for route visualization
- **Route Optimization:** Use existing route data; visualization only (no new algorithm)
- **Photo/Signature:** Firebase Storage upload, compress before upload
- **Offline Mode:** Cache assigned deliveries in IndexedDB/localStorage
  └─ Sync when online
  └─ Allow QR/OTP entry offline (verify when online)
- **Real-time Updates:** Firestore listener for delivery status changes
- **Mobile-First:** Large buttons (48px minimum), full-screen map, gesture controls
- **Location Tracking:** Request user permission, update delivery location on Firestore periodically
  └─ Only during IN_TRANSIT status
  └─ Stop updates after DELIVERED

NEW FILES:
- src/pages/logistics/RouteDetailPage.tsx
- src/pages/logistics/LogisticsAnalyticsPage.tsx
- src/components/logistics/MapWithRoute.tsx (Leaflet map)
- src/components/logistics/PhotoCapture.tsx (camera input)
- src/components/logistics/SignatureCanvas.tsx (signature pad)
- src/services/logisticsService.ts (queries: getAssignedDeliveries, updateDeliveryStatus, etc)

MAINTAIN:
- Firestore security rules (logistics can only update their own deliveries)
- QR/OTP verification security
- Existing order/delivery schema
- Firebase Storage upload limits

DO NOT:
- Allow logistics to manually set delivery status to DELIVERED (only via verified QR/OTP + photo)
- Track location without user permission
- Delete delivery records
- Change order/delivery Firestore schema without approval

BEFORE MAKING CHANGES:
- Confirm map library (Leaflet chosen, already in deps)
- Confirm photo compression settings (max file size?)
- Confirm signature pad library (recommend "react-signature-canvas")
- Test on mobile with GPS enabled
- Test offline mode (disconnect network, verify caching works)
```

---

## PROMPT 5: Login Portals - Admin & Logistics Authentication

```
You are enhancing the Admin & Logistics login portals for VAYORA.

CURRENT STATE:
- Files: src/pages/admin/AdminLoginPage.tsx, src/pages/logistics/LogisticsLoginPage.tsx
- Features: Phone OTP, reCAPTCHA, basic error messages
- Issues: Error messages unclear, no onboarding flows, mobile UX suboptimal

TASK: Improve authentication UX, security, error messaging, and add partner onboarding

SECTIONS REQUIRED:

1. ADMIN LOGIN PAGE (Enhance)
   - Title: "VAYORA Control Center - Administrator Sign In"
   - Subtitle: "Restricted Access - Governance & Oversight"
   
   - Input fields:
     └─ Phone Number (with country code dropdown, default +91 for India)
     └─ reCAPTCHA (existing)
     └─ Button: [Send Verification Code]
   
   - OTP Entry Screen (after phone submitted):
     └─ Large 6-digit OTP input field (numeric keyboard on mobile)
     └─ Countdown timer: "Code expires in 4:45"
     └─ Button: [Verify Code]
     └─ Link: "Didn't receive code? [Resend]" (disabled for 30s after send)
   
   - Error Handling (improved):
     ├─ "This phone number is not registered as an admin account"
     │  └─ Help text: "Contact the super-admin to request access"
     │  └─ Link: "Email support" (or support form)
     │
     ├─ "Invalid OTP. Please check and try again"
     │  └─ Show attempt count: "2 attempts remaining"
     │  └─ After 3 failed: "Too many attempts. Try again in 5 minutes"
     │
     ├─ "Network error. Please check your connection"
     │  └─ Retry button
     │
     └─ "reCAPTCHA verification failed. Please refresh and try again"
   
   - Success Flow:
     └─ "Verified!" message
     └─ Redirect to /admin/dashboard (or /admin/profile if first login)

2. LOGISTICS LOGIN PAGE (Similar to Admin, but different messaging)
   - Title: "VAYORA Logistics - Partner Sign In"
   - Subtitle: "Delivery & Route Management"
   
   - Same OTP flow as Admin
   
   - Error Handling:
     ├─ "This phone number is not registered as a logistics partner"
     │  └─ Help text: "To become a logistics partner, complete registration below"
     │  └─ Link: [Register as New Logistics Partner]
     │
     ├─ "Your account is not yet approved by admin"
     │  └─ Help text: "Your registration is pending review. You'll receive an SMS when approved"
     │  └─ Link: "Check status" (show timestamp of application)
     │
     └─ (Same network/reCAPTCHA errors as Admin)

3. NEW PAGE: LOGISTICS REGISTRATION (Onboarding)
   - URL: /logistics/register
   - Title: "Join VAYORA - Become a Logistics Partner"
   
   - Multi-step form:
     Step 1: Contact & Vehicle Info
     ├─ Full Name *
     ├─ Phone Number (with OTP verification) *
     ├─ Email *
     ├─ Vehicle Type (dropdown: 2-wheeler, auto, truck, van) *
     ├─ Vehicle Capacity (kg or tonnes) *
     └─ Vehicle Registration Number *
     
     Step 2: Location & Service Area
     ├─ Current Location (map picker or address search) *
     ├─ Service Area (dropdown: city/region) *
     ├─ Languages Spoken (checkboxes: Hindi, English, Marathi, etc) *
     └─ Availability (dropdown: Full-time, Part-time, Flexible) *
     
     Step 3: Documents & Verification
     ├─ Upload ID Proof (Aadhar/DL, file input, image)
     ├─ Upload Vehicle RC (Registration Certificate, file input, image)
     ├─ Upload Insurance Document (optional, file input)
     └─ Agree to Terms & Conditions (checkbox) *
     
     Step 4: Review & Submit
     ├─ Summary of all entered data
     ├─ Confirm accuracy
     ├─ Submit button: [Request Approval]
     └─ On success: "Application submitted! You'll receive SMS updates on approval status"
   
   - Form Features:
     └─ Progress bar (Step 1/4, 2/4, etc)
     └─ Save draft (localStorage) - user can come back later
     └─ Validation: required fields marked with *
     └─ File upload: validate image size (<5MB), format (JPG/PNG)
     └─ Phone OTP: verify phone is real before submission

4. NEW PAGE: ADMIN REGISTRATION (Super-Admin Only)
   - URL: /admin/register (only accessible if super-admin is logged in)
   - Title: "Add New Administrator"
   
   - Form:
     ├─ Full Name *
     ├─ Phone Number *
     ├─ Email *
     ├─ Admin Role (dropdown: Super-Admin, Moderator, Support) *
     ├─ Permissions (checkboxes: Manage Users, Resolve Disputes, Settle Payments, View Analytics)
     └─ Agree to Admin Agreement (checkbox) *
   
   - On Submit:
     └─ Send invitation SMS to phone: "You've been invited as VAYORA Admin. Verify here: [link]"
     └─ Link expires in 7 days
     └─ New admin must verify phone + set password (or skip password for phone-only)

5. PASSWORD & 2FA (Optional, Future-Proof)
   - Add to AuthContext (optional feature):
     └─ On first admin login, option to set password (not required)
     └─ If password set, login can be phone OR email+password
     └─ Optional 2FA: TOTP app (Google Authenticator, Authy)

TECHNICAL REQUIREMENTS:
- Maintain phone OTP flow (don't replace with password-based auth)
- Firestore queries: isAdminRegistered(phone), isLogisticsRegistered(phone), isLogisticsApproved(uid)
- File upload to Firebase Storage (admin reviews documents)
- Email notifications (via Cloud Functions) for admin approvals
- SMS notifications (via Twilio or Firebase) for updates
- Mobile-first responsive design (375px viewport)
- Form validation (required fields, phone format, file size)
- Loading states during submission
- Error messages clear and actionable

NEW FILES:
- src/pages/logistics/LogisticsRegistrationPage.tsx
- src/pages/admin/AdminRegistrationPage.tsx (super-admin only)
- src/components/auth/OtpInput.tsx (reusable 6-digit input)
- src/components/auth/FileUploadInput.tsx (reusable file upload with preview)
- src/services/registrationService.ts (submitLogisticsRegistration, submitAdminRegistration)

MAINTAIN:
- Firestore security rules (user can't self-assign ADMIN role)
- Phone OTP verification via Firebase
- reCAPTCHA for bots
- Existing admin/logistics user schema

DO NOT:
- Add passwords for regular farmers/buyers (phone OTP only)
- Allow self-registration as admin (super-admin invite only)
- Allow logistics without document verification
- Store sensitive files outside Firebase Storage

BEFORE MAKING CHANGES:
- Confirm Admin registration flow (super-admin invite or open registration?)
- Confirm document file size limits and formats
- Confirm email/SMS notification services (existing or to be set up?)
- Test OTP flow on mobile (numeric keyboard)
- Test file upload on slow networks (progress indicator)
```

---

## NOTES FOR ANTIGRAVITY

1. **Execution Priority** (suggested order):
   - PROMPT 1 (Code Analysis) - Start here, identify bugs first
   - PROMPT 2 (Farmer Dashboard) - Quick win, high impact
   - PROMPT 3 (Admin Dashboard) - Important for platform management
   - PROMPT 4 (Logistics Dashboard) - Depends on deliveries being live
   - PROMPT 5 (Login Portals) - Polish, can be done in parallel with others

2. **Testing Checklist (before completion):**
   - [ ] All pages tested on mobile (375px) and desktop (1024px+)
   - [ ] All forms have loading states and error handling
   - [ ] Firestore security rules still enforced (no privilege escalation)
   - [ ] Firebase console shows no errors/warnings
   - [ ] No console errors in browser DevTools
   - [ ] TypeScript compiles without warnings
   - [ ] All new components have proper TypeScript types

3. **Firestore Best Practices (mandatory):**
   - Always validate `user.id` matches request.auth.uid before reads/writes
   - Never trust client-side role; always verify in security rules
   - Use batch writes for multi-document updates (atomicity)
   - Index queries used in filters (check Firebase console)
   - Paginate queries (limit 50-100 docs per fetch)

4. **UI/UX Standards (maintain consistency):**
   - Color: Vayora green (#16a34a), white backgrounds, slate-600 text
   - Buttons: 40px minimum height, 16px padding, rounded-lg corners
   - Icons: Lucide React only (no custom SVGs)
   - Spacing: Tailwind gap-4, p-4 defaults
   - Shadows: Tailwind shadow-md for cards
   - Breakpoints: @375px (mobile), @768px (tablet), @1024px (desktop)

5. **Accessibility Requirements:**
   - All buttons must be keyboard-accessible (Tab key navigation)
   - Form labels linked to inputs (htmlFor attribute)
   - Error messages in aria-live regions
   - Images have alt text
   - Color not sole indicator (use icons/text + color)
   - Minimum contrast ratio 4.5:1 for text

6. **Questions? Review the original analysis document:**
   - Full codebase structure at C:\Users\DELL\OneDrive\VAYORA\
   - Types defined in src/types/index.ts
   - Firestore rules in firestore.rules
   - Example services in src/services/

---

## SUCCESS CRITERIA

✅ Code Analysis: All critical/high issues identified & listed (fixes pending approval)
✅ Farmer Dashboard: Mobile-responsive, clear produce status, offer priority visible
✅ Admin Dashboard: Analytics working, user management functional, audit log visible
✅ Logistics Dashboard: Route map shows all waypoints, photo/signature verification works
✅ Login Portals: Clear error messages, onboarding flows, mobile-friendly

**Ready to build! 🚀**
