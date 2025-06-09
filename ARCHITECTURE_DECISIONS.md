# Architecture Decision Records (ADRs)

This document tracks important architectural decisions for the Trainer Portal project.

## ADR-001: PDF Generation Strategy - Remove PDFKit, Use jsPDF Only

**Date**: December 2024  
**Status**: ✅ IMPLEMENTED  
**Decision**: Use frontend jsPDF for ALL PDF generation, PDFKit completely removed

### The Problem
PDFKit caused persistent font file errors in Next.js:
```
Error: ENOENT: no such file or directory, open 'Times-Roman.afm'
```

### The Solution
- ❌ **REMOVED**: `pdfkit`, `@types/pdfkit`, `dayjs` packages
- ❌ **REMOVED**: Server-side PDF generation API
- ✅ **STANDARDIZED**: Frontend jsPDF for all PDFs (contracts + invoices)

### Technical Pattern (ALWAYS USE THIS)
```typescript
// ✅ CORRECT: Frontend PDF generation
const generatePDF = async (recordId: number) => {
  const response = await fetch(`/api/resource/${recordId}`);
  const data = await response.json();
  
  const doc = new jsPDF();
  doc.setFont("helvetica", "normal"); // Built-in font only
  doc.text(data.trainer.firstName, 20, 30); // Real DB data
  doc.save(`document-${recordId}.pdf`);
};
```

### ⚠️ NEVER DO AGAIN
- Server-side PDF generation with PDFKit
- External font dependencies
- Hardcoded trainer data in PDFs

---

## ADR-002: Database-First Approach - No Frontend Mock Data

**Status**: ✅ IMPLEMENTED  
**Decision**: All data comes from database via APIs, comprehensive seed file

### What Was Done
- ✅ Moved mock data from components to database seed
- ✅ Created `/api/dashboard` and `/api/trainings` endpoints  
- ✅ All PDFs now use real trainer data from database

### Pattern
```typescript
// ✅ Frontend fetches real data
const data = await fetch('/api/trainings?type=upcoming');
// ❌ No more hardcoded mock arrays
```

---

## 🧠 CURSOR MEMORY - Key Technical Decisions

### PDF Generation Rules
1. **jsPDF ONLY** - Never use PDFKit again
2. **Frontend generation** - No server-side PDF APIs
3. **Helvetica font** - Built-in, no external files
4. **Real database data** - Always fetch before PDF generation

### Data Flow Rules  
1. **Database as single source of truth**
2. **Comprehensive seed file** for test scenarios
3. **API endpoints** provide structured JSON
4. **No hardcoded values** in production components

### Architecture Pattern
```
Database → API Endpoint → Frontend → jsPDF → Download
    ✅        ✅           ✅       ✅       ✅
```

**This pattern has been tested and works reliably for both contracts and accounting credits.** 