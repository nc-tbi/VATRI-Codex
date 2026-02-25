# Tax Core Operational Data Model - Audience View

This drawing is designed for mixed stakeholders (engineering, architecture, QA, delivery) to understand what data exists, where it lives, and how user actions move through services into persistent tables.

## 1) Bounded Context Data Model (ER view)

```mermaid
erDiagram
  REGISTRATION_REGISTRATIONS {
    uuid registration_id PK
    text taxpayer_id
    char8 cvr_number
    text status
    text cadence
    numeric annual_turnover_dkk
    timestamptz created_at
    timestamptz registered_at
    timestamptz deregistered_at
  }

  OBLIGATION_OBLIGATIONS {
    uuid obligation_id PK
    text taxpayer_id
    date tax_period_start
    date tax_period_end
    date due_date
    text cadence
    text state
    uuid filing_id
    uuid preliminary_assessment_id
    timestamptz created_at
  }

  OBLIGATION_PRELIMINARY_ASSESSMENTS {
    uuid preliminary_assessment_id PK
    uuid obligation_id FK
    text taxpayer_id
    date tax_period_end
    numeric estimated_net_vat
    text state
    uuid superseding_filing_id
    numeric final_net_vat
    timestamptz triggered_at
    timestamptz issued_at
    timestamptz superseded_at
  }

  FILING_FILINGS {
    uuid filing_id PK
    text taxpayer_id
    char8 cvr_number
    text filing_type
    text state
    date tax_period_start
    date tax_period_end
    timestamptz submission_timestamp
    text rule_version_id
    int assessment_version
    numeric stage1
    numeric stage2
    numeric stage3
    numeric stage4
    text result_type
    numeric claim_amount
    uuid claim_id
    text claim_status
    timestamptz created_at
  }

  FILING_ADMIN_ALTER_EVENTS {
    uuid event_id PK
    uuid filing_id FK
    text event_type
    uuid alter_id
    jsonb field_deltas
    text actor_role
    text trace_id
    timestamptz created_at
  }

  ASSESSMENT_ASSESSMENTS {
    uuid assessment_id PK
    uuid filing_id
    int assessment_version
    text assessment_type
    text taxpayer_id
    date tax_period_end
    text rule_version_id
    numeric stage4_net_vat
    text result_type
    numeric claim_amount
    timestamptz assessed_at
    timestamptz created_at
  }

  AMENDMENT_AMENDMENTS {
    uuid amendment_id PK
    uuid original_filing_id
    int prior_assessment_version
    int new_assessment_version
    text taxpayer_id
    date tax_period_end
    numeric delta_net_vat
    text delta_classification
    bool new_claim_required
    timestamptz created_at
  }

  AMENDMENT_ADMIN_ALTER_EVENTS {
    uuid event_id PK
    uuid amendment_id FK
    text event_type
    uuid alter_id
    jsonb field_deltas
    text actor_role
    timestamptz created_at
  }

  CLAIM_CLAIM_INTENTS {
    uuid claim_id PK
    text idempotency_key UK
    text taxpayer_id
    date tax_period_end
    int assessment_version
    uuid filing_id
    text status
    int retry_count
    timestamptz next_retry_at
    timestamptz last_attempted_at
    timestamptz created_at
  }

  AUDIT_EVIDENCE_ENTRIES {
    uuid evidence_id PK
    text trace_id
    text service_name
    text action_type
    timestamptz event_timestamp
    uuid filing_id
    uuid assessment_id
    uuid claim_id
    jsonb payload_snapshot
    timestamptz created_at
  }

  OBLIGATION_OBLIGATIONS ||--o{ OBLIGATION_PRELIMINARY_ASSESSMENTS : obligation_id
  FILING_FILINGS ||--o{ FILING_ADMIN_ALTER_EVENTS : filing_id
  AMENDMENT_AMENDMENTS ||--o{ AMENDMENT_ADMIN_ALTER_EVENTS : amendment_id

  FILING_FILINGS }o..o{ ASSESSMENT_ASSESSMENTS : filing_id_ref
  FILING_FILINGS }o..o{ AMENDMENT_AMENDMENTS : original_filing_id_ref
  FILING_FILINGS }o..o{ CLAIM_CLAIM_INTENTS : filing_id_ref
  FILING_FILINGS }o..o{ AUDIT_EVIDENCE_ENTRIES : filing_id_ref
  ASSESSMENT_ASSESSMENTS }o..o{ AUDIT_EVIDENCE_ENTRIES : assessment_id_ref
  CLAIM_CLAIM_INTENTS }o..o{ AUDIT_EVIDENCE_ENTRIES : claim_id_ref
```

Notes:
- Dotted relationships represent cross-context soft references (no cross-schema FK).
- Hard FK constraints are used only inside a bounded context.
- Core lineage path is Filing -> Assessment (versioned) -> Claim and Filing -> Amendment.

## 2) User Action to Persistence Map

```mermaid
flowchart LR
  U[Portal User] --> F1[Submit Filing\nPOST /vat-filings]
  U --> F2[Submit Amendment\nPOST /amendments]
  U --> F3[Create Registration\nPOST /registrations]
  U --> F4[Admin Alter Filing\nPOST /vat-filings/:id/alter]
  U --> F5[Admin Alter Amendment\nPOST /amendments/:id/alter]

  F1 --> T1[(filing.filings)]
  F1 --> T2[(filing.filing_admin_alter_events)]
  F2 --> T3[(amendment.amendments)]
  F2 --> T4[(amendment.amendment_admin_alter_events)]
  F3 --> T5[(registration.registrations)]
  F4 --> T2
  F5 --> T4

  T1 -. expected downstream .-> T6[(assessment.assessments)]
  T1 -. expected downstream .-> T7[(claim.claim_intents)]
```

Interpretation:
- Solid arrows are implemented direct writes.
- Dotted arrows are expected by product flow but currently depend on separate orchestration or missing calls.
