# Dashboard Views & Data Analysis

## Menu Structure (from `dashboard/layout.tsx`)

### Common Menu Items (Both Trainers & Companies)
1. **DASHBOARD** (`/dashboard`)
2. **PROFIL** (`/dashboard/profile`)
3. **TRAININGS** (`/dashboard/trainings`)
4. **ANFRAGEN** (`/dashboard/requests`)
5. **RECHNUNGEN** (`/dashboard/invoices`)

### Company-Only Menu Items
6. **TRAINER** (`/dashboard/trainer`) - Trainer search

### Common Menu Items (Both Trainers & Companies)
7. **NACHRICHTEN** (`/dashboard/messages`) - Unified messages/chat for both user types

---

## Detailed View Analysis

### 1. DASHBOARD (`/dashboard/page.tsx`)

#### **For Trainers:**
**Intended Data:**
- Upcoming trainings (next 3, ACCEPTED status, future dates)
- Pending requests count
- Quick stats/overview

**Actual Implementation:**
- ✅ Fetches `/api/training-requests?trainerId=${userId}` for pending requests count
- ✅ Fetches `/api/trainings?trainerId=${userId}&type=upcoming` for upcoming trainings (in parallel)
- ✅ Filters for PENDING status to count pending requests
- ✅ Limits to next 3 trainings for dashboard display
- ✅ Shows pending requests count
- ✅ Shows upcoming trainings in "ANSTEHENDE TRAININGS" card
- ✅ Uses `getUserData()` correctly

**Verdict:** ✅ **FIXED** - Now fetches and displays upcoming trainings correctly

---

#### **For Companies:**
**Intended Data:**
- Quick access cards (Trainer Search, Training Plan, Training Requests)
- Welcome message
- Overview information

**Actual Implementation:**
- ✅ Shows quick action cards
- ✅ Links to trainer search, trainings, requests
- ✅ Uses `getUserData()` correctly

**Verdict:** ✅ Correct

---

### 2. PROFIL (`/dashboard/profile/page.tsx`)

#### **For Trainers:**
**Intended Data:**
- Personal information (name, email, phone, address)
- Bio
- Profile picture
- Topics with expertise levels
- Daily rate
- Bank details (IBAN, tax ID)
- Company name (if trainer is a company)

**Actual Implementation:**
- ✅ Fetches `/api/trainer/profile` (GET)
- ✅ Updates `/api/trainer/profile` (PATCH)
- ✅ Shows all trainer fields
- ✅ Handles topics with levels
- ✅ Uses `getUserData()` correctly
- ✅ Saves with `saveTrainerData()` for trainers

**Verdict:** ✅ Correct

---

#### **For Companies:**
**Intended Data:**
- Company information (company name, contact person)
- Address
- Bio
- Logo
- Website, industry, employees
- Consultant name
- VAT ID, billing email, billing notes
- Bank details (IBAN, tax ID)

**Actual Implementation:**
- ✅ Fetches `/api/training-company/profile` (GET)
- ✅ Updates `/api/training-company/profile` (PATCH)
- ✅ Shows all company fields
- ✅ Uses `getUserData()` correctly
- ✅ Saves with `saveCompanyData()` for companies

**Verdict:** ✅ Correct

---

### 3. TRAININGS (`/dashboard/trainings/page.tsx`)

#### **For Trainers:**
**Intended Data:**
- Upcoming trainings (ACCEPTED status, future dates)
- Past trainings (ACCEPTED status, past dates)
- Training details: title, topic, date, time, location, participants, company info
- Assigned trainer info (should only show "You" for trainers)
- Contract PDF generation for completed trainings

**Actual Implementation:**
- ✅ Fetches `/api/trainings?trainerId=${userId}&type=upcoming`
- ✅ Fetches `/api/trainings?trainerId=${userId}&type=past`
- ✅ API filters by `trainerId` and `status: 'ACCEPTED'`
- ✅ Shows training details correctly
- ✅ Shows assigned trainer as "You" for trainers
- ✅ Contract PDF generation works
- ✅ Uses `getUserData()` correctly
- ✅ Authorization: API verifies `trainerId` matches current user

**Verdict:** ✅ Correct

---

#### **For Companies:**
**Intended Data:**
- Upcoming trainings (created by company, not COMPLETED)
- Past trainings (created by company, COMPLETED status)
- Training details: title, topic, date, time, location, participants
- Assigned trainer info (should show actual trainer name)
- All requests for each training

**Actual Implementation:**
- ✅ Fetches `/api/trainings?companyId=${userId}&type=upcoming`
- ✅ Fetches `/api/trainings?companyId=${userId}&type=past`
- ✅ API filters by `companyId`
- ✅ Shows training details correctly
- ✅ Shows assigned trainer name when available
- ✅ Uses `getUserData()` correctly
- ✅ Authorization: API verifies `companyId` matches current user

**Verdict:** ✅ Correct

---

### 4. ANFRAGEN (`/dashboard/requests/page.tsx`)

#### **For Trainers:**
**Intended Data:**
- Training requests sent TO the trainer (where trainer is recipient)
- Request details: training title, topic, date, location, participants, company info
- Request status: pending, accepted, rejected, abgesagt
- Counter price field
- Ability to accept/decline requests
- Contract generation
- Messages/inquiries related to requests

**Actual Implementation:**
- ✅ Fetches `/api/training-requests?trainerId=${userId}`
- ✅ Shows all requests for the trainer
- ✅ Shows company information
- ✅ Can accept/decline requests
- ✅ Counter price functionality
- ✅ Contract PDF generation
- ✅ Message/inquiry functionality
- ✅ Uses `getUserData()` correctly
- ✅ Authorization: API verifies `trainerId` matches current user
- ✅ Pending requests sorted to top
- ✅ Pending requests highlighted

**Verdict:** ✅ Correct

---

#### **For Companies:**
**Intended Data:**
- Training requests FOR their trainings (where company is sender)
- Request details: training title, topic, date, location, participants, trainer info
- Request status: pending, accepted, rejected, abgesagt
- Counter price from trainers
- Ability to accept/decline requests
- All trainers who applied for each training

**Actual Implementation:**
- ✅ Fetches trainings first (`/api/trainings?companyId=${userId}&type=upcoming` and `type=past`)
- ✅ Then fetches requests for each training (`/api/training-requests?trainingId=${trainingId}`)
- ✅ Shows all requests for company's trainings
- ✅ Shows trainer information
- ✅ Can accept/decline requests
- ✅ Counter price functionality
- ✅ Uses `getUserData()` correctly
- ✅ Authorization: API verifies company owns the training when fetching by `trainingId`
- ⚠️ **POTENTIAL ISSUE**: Company can see all requests for a training, but API should verify company owns the training (which it does)

**Verdict:** ✅ Correct

---

### 5. RECHNUNGEN (`/dashboard/invoices/page.tsx`)

#### **For Trainers:**
**Intended Data:**
- Invoices/accounting credits for completed trainings
- Invoice number, course title, amount, status
- Download invoices
- Trainer's own invoices only

**Actual Implementation:**
- ✅ Fetches `/api/accounting-credits?trainerId=${userId}`
- ✅ Shows invoices for trainer
- ✅ Uses `getUserData()` correctly
- ✅ Uses `getUserData()` in `downloadCredit` function as well

**Verdict:** ✅ **FIXED** - Now uses `getUserData()` consistently

---

#### **For Companies:**
**Intended Data:**
- Invoices/accounting credits for trainings they created
- Invoice number, course title, amount, status
- Download invoices
- Company's own invoices only

**Actual Implementation:**
- ✅ Fetches `/api/accounting-credits?companyId=${userId}`
- ✅ Shows invoices for company
- ✅ Uses `getUserData()` correctly
- ✅ Uses `getUserData()` in `downloadCredit` function as well

**Verdict:** ✅ **FIXED** - Now uses `getUserData()` consistently

---

### 6. TRAINER (`/dashboard/trainer/page.tsx`) - **Company Only**

#### **For Companies:**
**Intended Data:**
- Trainer search interface
- Search by topic, location, price, expertise level
- Trainer results with: name, bio, profile picture, daily rate, topics, location
- Ability to view trainer profile
- Ability to send training requests to trainers

**Actual Implementation:**
- ✅ Redirects non-companies to dashboard
- ✅ Shows trainer search interface
- ✅ Fetches `/api/trainers/search` with filters
- ✅ Shows trainer results
- ✅ Links to trainer profile page
- ✅ Uses `getUserData()` correctly
- ✅ Only visible to companies (menu item conditional)

**Verdict:** ✅ Correct

---

### 7. NACHRICHTEN (`/dashboard/messages/page.tsx`) - **Both Trainers & Companies**

#### **For Trainers:**
**Intended Data:**
- Conversations grouped by training request
- Messages between trainer and company
- Company name for each conversation
- Training title for context
- Ability to send messages
- Unread message count

**Actual Implementation:**
- ✅ Fetches `/api/training-request-messages?userId=${userId}&userType=${userType}`
- ✅ Groups messages by `trainingRequestId` into conversations
- ✅ Shows company name (for trainers)
- ✅ Shows training title
- ✅ Can send messages
- ✅ Marks conversations as read
- ✅ Uses `getUserData()` correctly
- ✅ Uses ChatInterface component (conversation-based UI)

**Verdict:** ✅ Correct

---

#### **For Companies:**
**Intended Data:**
- Conversations grouped by training request
- Messages between company and trainer
- Trainer name for each conversation
- Training title for context
- Ability to send messages
- Unread message count

**Actual Implementation:**
- ✅ Fetches `/api/training-request-messages?userId=${userId}&userType=${userType}`
- ✅ Groups messages by `trainingRequestId` into conversations
- ✅ Shows trainer name (for companies)
- ✅ Shows training title
- ✅ Can send messages
- ✅ Marks conversations as read
- ✅ Uses `getUserData()` correctly
- ✅ Uses ChatInterface component (conversation-based UI)
- ✅ `/dashboard/chat` redirects to `/dashboard/messages` for backward compatibility

**Verdict:** ✅ Correct - Now unified for both user types

---

### 8. TRAINER PROFILE (`/dashboard/trainer/[id]/page.tsx`) - **Company Only**

#### **For Companies:**
**Intended Data:**
- Trainer profile details
- Past bookings between company and trainer
- Available trainings that trainer can be requested for
- Ability to send training requests

**Actual Implementation:**
- ✅ Fetches `/api/trainers/${trainerId}`
- ✅ Fetches past bookings (`/api/bookings/past?trainerId=${trainerId}&companyId=${companyId}`)
- ✅ Shows available trainings
- ✅ Can send training requests
- ✅ Uses `getUserData()` correctly
- ✅ **FIXED**: Now has explicit check that user is a company (redirects to dashboard if not)

**Verdict:** ✅ Correct

---

### 9. TRAINING DETAILS (`/dashboard/training/[id]/page.tsx`)

#### **For Trainers:**
**Intended Data:**
- Training details: title, topic, date, time, location, participants, description
- Company information
- Assigned trainer info (ONLY if it's the current trainer)
- Training status

**Actual Implementation:**
- ✅ Fetches `/api/trainings/${trainingId}`
- ✅ API checks: Trainer only sees assigned trainer if it's them
- ✅ Shows training details
- ✅ Shows company info
- ✅ Uses `getUserData()` correctly
- ✅ Privacy: Correctly implemented in API

**Verdict:** ✅ Correct

---

#### **For Companies:**
**Intended Data:**
- Training details: title, topic, date, time, location, participants, description
- Company information (their own)
- Assigned trainer info (always visible for companies)
- Training status

**Actual Implementation:**
- ✅ Fetches `/api/trainings/${trainingId}`
- ✅ API checks: Company always sees assigned trainer
- ✅ Shows training details
- ✅ Uses `getUserData()` correctly
- ✅ Privacy: Correctly implemented in API

**Verdict:** ✅ Correct

---

### 10. CREATE TRAINING (`/dashboard/trainings/create/page.tsx`) - **Company Only**

#### **For Companies:**
**Intended Data:**
- Form to create new training
- Topic selection
- Date/time selection
- Location details
- Trainer selection (from available trainers)
- Ability to send requests to selected trainers

**Actual Implementation:**
- ✅ Redirects non-companies to dashboard
- ✅ Shows training creation form
- ✅ Fetches topics (`/api/topics?all=true`)
- ✅ Fetches trainers by topic (`/api/trainers/search?topicId=${topicId}`)
- ✅ Creates training via `/api/trainings` (POST)
- ✅ Sends requests via `/api/training-requests` (POST)
- ✅ Uses `getUserData()` correctly
- ✅ Only accessible to companies

**Verdict:** ✅ Correct

---

## Summary of Issues Found and Fixed

### ✅ Fixed Critical Issues:
1. **Dashboard for Trainers**: ✅ **FIXED** - Now fetches upcoming trainings in `fetchDashboardData` function using parallel API calls

### ✅ Fixed Minor Issues:
1. **Invoices Page**: ✅ **FIXED** - Now uses `getUserData()` consistently throughout
2. **Trainer Profile Page**: ✅ **FIXED** - Added explicit company check that redirects non-companies to dashboard

### ✅ Fixed Feature Unification:
1. **Chat/Messages Unification**: ✅ **FIXED** - Chat and Messages are now unified into single "NACHRICHTEN" page:
   - `/dashboard/messages` - Main page using ChatInterface (conversation-based) for both user types
   - `/dashboard/chat` - Redirects to `/dashboard/messages` for backward compatibility
   - Menu shows "NACHRICHTEN" for both trainers and companies
   - Both user types see conversations grouped by training request
   - Trainers see company names, companies see trainer names

### Authorization Verification:
✅ All API endpoints have proper authorization checks:
- `/api/training-requests`: Verifies trainer can only see their own requests, company can only see requests for their trainings
- `/api/trainings`: Verifies trainer/company can only see their own trainings
- `/api/trainings/[id]`: Verifies privacy (trainers only see assigned trainer if it's them)

### Privacy Verification:
✅ All privacy concerns addressed:
- Trainers only see their own data
- Companies only see their own trainings and requests
- Assigned trainer info only shown to appropriate users
- No cross-user data leakage

---

## Final Status

✅ **All Issues Fixed:**
1. ✅ Dashboard for Trainers now fetches and displays upcoming trainings
2. ✅ Invoices page now uses `getUserData()` consistently
3. ✅ Trainer profile page has explicit company check
4. ✅ Chat and Messages unified into single "NACHRICHTEN" page for both user types

## Updated Menu Structure

### Common Menu Items (Both Trainers & Companies)
1. **DASHBOARD** (`/dashboard`)
2. **PROFIL** (`/dashboard/profile`)
3. **TRAININGS** (`/dashboard/trainings`)
4. **ANFRAGEN** (`/dashboard/requests`)
5. **NACHRICHTEN** (`/dashboard/messages`) - **Unified for both user types**
6. **RECHNUNGEN** (`/dashboard/invoices`)

### Company-Only Menu Items
7. **TRAINER** (`/dashboard/trainer`) - Trainer search

**Note:** `/dashboard/chat` redirects to `/dashboard/messages` for backward compatibility.

