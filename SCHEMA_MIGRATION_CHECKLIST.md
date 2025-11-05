# Schema Migration Checklist - COMPLETED ✅

**Status:** Alle kritischen Änderungen durchgeführt

## 📋 Schema-Änderungen Zusammenfassung

### Entfernt:
- ❌ **Event** Tabelle
- ❌ **Inquiry.eventId**

### Geändert:
- 🔄 **Inquiry.trainingId** - jetzt Bezug zu Training (statt Event)
- 🔄 **Training.participants** → **Training.participantCount** (Int)
- 🔄 **Participant.eventId** → **Participant.trainingId**
- 🔄 **Invoice.courseId** → **Invoice.trainingId**

### Hinzugefügt:
- ✅ **Message** Tabelle (generisch)
- ✅ **Training.courseId** - Bezug zum Course-Template
- ✅ **Training.trainerId** - Zugewiesener Trainer
- ✅ **Training.participants** - Relation zu Participant[]
- ✅ **Training.inquiries** - Relation zu Inquiry[]
- ✅ **Training.invoices** - Relation zu Invoice[]
- ✅ **InquiryMessage.inquiryId** - Primäre Relation
- ✅ **Inquiry.messages** - Relation zu InquiryMessage[]

## 🔧 Code-Änderungen erforderlich:

### API-Routen (kritisch):

1. **`/api/requests/route.ts`**
   - ❌ `inquiry.event` → ✅ `inquiry.training`
   - ❌ `event.course` → ✅ `training.topic`
   - ❌ `event.date` → ✅ `training.startDate`

2. **`/api/dashboard/route.ts`**
   - ❌ `inquiry.event` → ✅ `inquiry.training`
   - ❌ `event.date` → ✅ `training.startDate`
   - ❌ `event.course.title` → ✅ `training.title`

3. **`/api/requests/[id]/route.ts`**
   - ❌ `inquiry.event` → ✅ `inquiry.training`
   - Prüfen: generateAccountingCredit Funktion

4. **`/api/accounting-credits/route.ts`**
   - ❌ `inquiry.event.course` → ✅ `inquiry.training`
   - ❌ Event-basierte Logik → Training-basiert

5. **`/api/trainings/route.ts`**
   - ❌ `participants: Int` → ✅ `participantCount: Int`

6. **`/api/trainings/[id]/route.ts`**
   - ❌ `participants` → ✅ `participantCount`

7. **`/api/seed/route.ts`**
   - Komplett neu schreiben ohne Event/Inquiry

### Frontend (zu prüfen):

8. **`/dashboard/requests/page.tsx`**
   - Prüfen ob event-Felder verwendet werden

9. **`/dashboard/trainings/page.tsx`**
   - Prüfen ob participants korrekt ist

10. **`/dashboard/invoices/page.tsx`**
    - ❌ `inquiry.event.course` → ✅ `inquiry.training`

11. **`/dashboard/trainer/[id]/page.tsx`**
    - Prüfen Event-Referenzen

12. **`/dashboard/trainings/create/page.tsx`**
    - ❌ `participants` → ✅ `participantCount`

## ✅ Migrations-Strategie:

1. API-Routen von innen nach außen fixen
2. Frontend danach anpassen
3. Seed-Route zuletzt
4. Testen nach jeder Änderung

## 🎯 Kritische Punkte:

- **Inquiry** muss jetzt `training` statt `event` includen
- **Training** hat jetzt `participantCount` statt `participants`
- **InquiryMessage** kann jetzt `inquiryId` ODER `trainingRequestId` haben
- **Participant** referenziert jetzt `trainingId`

