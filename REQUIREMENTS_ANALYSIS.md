# Requirements Analysis: Dozentenportal (Trainer Portal) v1.0

## Overview
This document analyzes how the current system fulfills the requirements specified in Jira ticket MMS-444 for the Dozentenportal (Trainer Portal) v1.0.

---

## 1. Authentication & Registration

### ✅ IMPLEMENTED

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **POST /register** | `POST /api/register-trainer` | ✅ Implemented |
| **POST /login** | `POST /api/login` (action: 'request-link') | ✅ Implemented (Passwordless) |
| **POST /forgot-password** | `POST /api/login` (action: 'request-link') | ✅ Implemented (Same as login) |

**Differences:**
- **Login Method**: Current system uses **passwordless authentication** (email link) instead of password-based login
- **Registration**: Includes additional fields like `topicsWithLevels`, `offeredTrainingTypes`, `travelRadius` which are not in requirements
- **Missing**: Password-based login and password reset functionality

---

## 2. Profile Management

### ✅ PARTIALLY IMPLEMENTED

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **GET /profile/{id}** | `GET /api/trainer/profile` | ✅ Implemented |
| **PATCH /profile/{id}** | `PATCH /api/trainer/profile` | ✅ Implemented |

**What We Have:**
- Basic profile fields (firstName, lastName, email, phone, address)
- Bio, profile picture, IBAN, taxId
- Company information (isCompany, companyName)
- Daily rate, status, travel radius
- Topics with expertise levels
- Offered training types (ONLINE, HYBRID, VOR_ORT)
- Profile versioning system

**What's Different:**
- **Address Structure**: Single address fields (street, houseNumber, zipCode, city) instead of multiple `postaddresses` with types
- **Contact Information**: Single email/phone instead of multiple `emailaddresses`/`phonenumbers` arrays
- **Missing Fields**:
  - `salutation` (male/female)
  - `accounting_company`, `accounting_holder`, `accounting_bic`, `accounting_vatnr`, `accounting_taxnr`, `accounting_is_small_business`
  - `autodesk_certified`
  - `instructor_since`
  - `bookable` status
  - `block_reason`

**What's Missing:**
- ❌ **POST/PATCH/DELETE /emailaddresses** - Multiple email addresses management
- ❌ **POST/PATCH/DELETE /phonenumbers** - Multiple phone numbers management
- ❌ **POST/PATCH/DELETE /postaddresses** - Multiple addresses management (visitor, invoice, delivery, headquarter)

---

## 3. Areas (Einzugsgebiete / Travel Areas)

### ❌ NOT IMPLEMENTED

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **GET /areas/{id}** | None | ❌ Missing |
| **POST /areas** | None | ❌ Missing |
| **PATCH /areas/{id}** | None | ❌ Missing |
| **DELETE /areas/{id}** | None | ❌ Missing |

**What We Have:**
- `travelRadius` field on Trainer model (single radius value)
- No support for multiple travel areas with specific locations

**What's Missing:**
- Multiple travel areas with:
  - Street, zip, city, country
  - Radius per area
  - Latitude/longitude coordinates
  - Geocoding support

---

## 4. Absences (Abwesenheiten)

### ❌ NOT IMPLEMENTED

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **GET /absences/{id}** | None | ❌ Missing |
| **POST /absences** | None | ❌ Missing |
| **PATCH /absences/{id}** | None | ❌ Missing |
| **DELETE /absences/{id}** | None | ❌ Missing |

**What We Have:**
- `Availability` model exists but is for weekly availability (dayOfWeek, startTime, endTime)
- No support for date-range absences

**What's Missing:**
- Planned absences with:
  - Start date
  - End date
  - Optional note/reason

---

## 5. Skills (Fähigkeiten / Knowledge)

### ✅ PARTIALLY IMPLEMENTED

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **GET /all_skills** | `GET /api/topics` | ✅ Implemented (Similar) |
| **GET /skills/{id}** | Included in `GET /api/trainer/profile` | ✅ Implemented |
| **PATCH /skills/{id}** | Included in `PATCH /api/trainer/profile` | ✅ Implemented |

**What We Have:**
- Topics with expertise levels (GRUNDLAGE, FORTGESCHRITTEN, EXPERTE)
- Topic suggestions system
- Skills are managed as part of profile

**What's Different:**
- **Structure**: Uses `TrainerTopic` with `expertiseLevel` instead of `Knowledge` with `knowledge_type` and `is_disabled`
- **Knowledge Types**: No distinction between "Application" and "Softskill" types
- **API Structure**: Skills are part of profile endpoint, not separate endpoints

**What's Missing:**
- ❌ Separate skills endpoints
- ❌ `knowledge_type` field (Application vs Softskill)
- ❌ `is_disabled` flag per skill

---

## 6. Requested Events (Dozentenanfragen)

### ✅ IMPLEMENTED (Different Structure)

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **GET /requested_events/{id}** | `GET /api/training-requests?trainerId={id}` | ✅ Implemented |
| **GET /requested_events/event/{id}** | `GET /api/training-requests?trainingId={id}` | ✅ Implemented |
| **PATCH /events/event/{id}/instructor/{id}/send_request_decision** | `PATCH /api/training-requests` | ✅ Implemented |

**What We Have:**
- Training requests system
- Status management (PENDING, ACCEPTED, DECLINED)
- Counter offers (counterPrice, companyCounterPrice)
- Request messages/chat

**What's Different:**
- **Naming**: Uses "TrainingRequest" instead of "Event" terminology
- **Structure**: 
  - Requirements use `event_fee` and `event_expenses`
  - Current system uses `counterPrice` and `companyCounterPrice`
- **Status Values**: 
  - Requirements: `request-accepted`, `request-declined`, `counteroffer-sent`
  - Current: `ACCEPTED`, `DECLINED`, `PENDING` (with counter offers)
- **Event Details**: Requirements include more detailed event information (key, consultant, event_dates, location_classroom, participants)

**What's Missing:**
- ❌ Event `key` field (like "V-D58QX")
- ❌ Detailed `consultant` information in request response
- ❌ `event_dates` array structure
- ❌ `location_classroom` details in request
- ❌ `participants` list in request
- ❌ `training_type` field
- ❌ `event_fee` and `event_expenses` as separate fields (currently only counter offers)

---

## 7. Events (Veranstaltungen / Trainings)

### ✅ PARTIALLY IMPLEMENTED

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **GET /events/{id}** | `GET /api/trainings?trainerId={id}` | ✅ Implemented |
| **GET /events/event/{id}** | `GET /api/trainings/{id}` | ✅ Implemented |

**What We Have:**
- Training listing and details
- Status filtering (upcoming, past/completed)
- Topic, company, trainer information
- Start/end dates and times
- Location information
- Participant count

**What's Different:**
- **Naming**: Uses "Training" instead of "Event"
- **Structure**: 
  - Requirements: `event_dates` array, `location_classroom` object, `participants` array
  - Current: Single `startDate`, `endDate`, `startTime`, `endTime`, `location` string, `participantCount` number
- **Missing Fields**:
  - ❌ Event `key` (unique identifier like "V-D58QX")
  - ❌ `status` values: "upcoming", "completed", "cancelled" (we have: PUBLISHED, DRAFT, COMPLETED, IN_PROGRESS, CANCELLED)
  - ❌ `consultant` object with name, short_code, email
  - ❌ `event_dates` array (multiple dates)
  - ❌ `location_classroom` detailed object
  - ❌ `participants` array with detailed participant information
  - ❌ `training_type` field

**What's Missing:**
- ❌ **PATCH /events/event/{id}/individual_contents** - Update individual training contents
- ❌ **POST /events/event/{id}/upload_invoice** - Upload honor invoice
- ❌ **PATCH /events/event/update_participant/{id}** - Update participant data
- ❌ **GET /events/event/{id}/instructor/{id}/download_contract** - Download contract PDF

---

## 8. Ratings (Bewertungen)

### ❌ NOT IMPLEMENTED

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **GET /instructor/{id}/ratings** | None | ❌ Missing |

**What's Missing:**
- Evaluation system
- Rating aggregation (total_avg_rating)
- Individual evaluation ratings
- Connection to participants/evaluations

---

## 9. Emails

### ✅ PARTIALLY IMPLEMENTED

| Requirement | Current Implementation | Status |
|------------|----------------------|--------|
| **GET /emails/{id}** | `GET /api/messages` (via ChatInterface) | ✅ Partially Implemented |
| **GET /emails/email/{id}** | Included in messages | ✅ Partially Implemented |
| **PATCH /emails/email/{id}** | Message read status | ✅ Partially Implemented |

**What We Have:**
- Message system for training requests
- Read/unread status
- Message attachments
- Conversation threading

**What's Different:**
- **Structure**: Uses `Message` model instead of `Email` model
- **Scope**: Currently only messages related to training requests, not general email system
- **Missing Fields**:
  - ❌ `uid` (email UID)
  - ❌ `html_body` and `text_body` separation
  - ❌ `type` (incoming/outgoing)
  - ❌ `is_answered`, `is_answered_all`, `is_forwarded`
  - ❌ `delivery_date`
  - ❌ `state` (open, closed, etc.)
  - ❌ `is_draft`, `is_public`, `is_displayed`
  - ❌ `email_attachments` detailed structure
  - ❌ `subject`, `from`, `to`, `cc`, `bcc`, `reply_to`
  - ❌ `priority`, `labels`

**What's Missing:**
- ❌ Full email system (currently only training request messages)
- ❌ Email composition/sending
- ❌ Email attachments management
- ❌ Email threading and conversation view

---

## 10. Business Process Compliance

### ✅ PARTIALLY IMPLEMENTED

| Process Step | Current Implementation | Status |
|-------------|----------------------|--------|
| **1. Sales requests trainers** | ✅ Companies can create trainings and request trainers | ✅ Implemented |
| **2. Trainer receives request** | ✅ Trainers see requests in dashboard | ✅ Implemented |
| **3. Trainer accepts/declines** | ✅ Trainers can accept/decline with counter offers | ✅ Implemented |
| **4. Contract generation** | ❌ No contract generation/PDF download | ❌ Missing |
| **5. Invoice upload** | ❌ No invoice upload functionality | ❌ Missing |
| **6. Payment processing** | ✅ Invoice viewing exists, but no upload | ⚠️ Partial |

---

## Summary

### ✅ Fully Implemented (8/30 endpoints)
- Registration
- Login (passwordless)
- Profile GET/PATCH (basic)
- Training requests (basic)
- Trainings listing (basic)
- Skills/Topics (basic)

### ⚠️ Partially Implemented (6/30 endpoints)
- Profile (missing multiple addresses/contacts)
- Skills (different structure)
- Requested events (different structure)
- Events (missing details and actions)
- Emails (only training request messages)

### ❌ Not Implemented (16/30 endpoints)
- Multiple email addresses management
- Multiple phone numbers management
- Multiple addresses management
- Travel areas (Einzugsgebiete)
- Absences (Abwesenheiten)
- Individual training contents update
- Invoice upload
- Participant data update
- Contract download
- Ratings/Evaluations
- Full email system

### Key Architectural Differences

1. **Authentication**: Passwordless (email link) vs Password-based
2. **Data Model**: 
   - Single contact info vs multiple addresses/emails/phones
   - Training vs Event terminology
   - Different status values and structures
3. **Business Logic**:
   - Counter offers vs fixed event fees
   - Training request focus vs full event management
   - No contract/invoice upload workflow

### Priority Missing Features

**High Priority:**
1. Invoice upload functionality
2. Contract download
3. Multiple addresses/contacts management
4. Travel areas management
5. Absences management

**Medium Priority:**
1. Individual training contents
2. Participant data management
3. Ratings/Evaluations
4. Enhanced event details (key, consultant, dates array)

**Low Priority:**
1. Full email system (if training request messages are sufficient)
2. Password-based authentication (if passwordless is acceptable)

---

## Recommendations

1. **Immediate**: Implement invoice upload and contract download (critical for business process)
2. **Short-term**: Add multiple addresses/contacts, travel areas, and absences
3. **Medium-term**: Enhance event structure to match requirements (keys, consultants, dates arrays)
4. **Long-term**: Consider full email system if needed, or document that training request messages are sufficient

