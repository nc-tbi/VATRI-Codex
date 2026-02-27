# Role Instructions: Structured Post-Release Review & Lessons Learned

Reference date: 2026-02-26

## Purpose

Each role must produce a **separate, structured, constructive review document** reflecting on:

- What worked well
- What did not work well
- Lessons learned
- What should be improved next time
- Concrete suggestions for future projects
- Cross-role collaboration observations

Each document must be:
- Written strictly from the perspective of the role
- Professional, honest, and constructive
- Specific (avoid generic statements)
- Action-oriented
- Human-readable and well-structured
- Focused on process, collaboration, and technical execution

The objective is continuous improvement, not blame assignment.

---

## Required Output Format

Each role must create a file:


retrospective/<role-name>-review.md


Example:

retrospective/architect-review.md
retrospective/frontend-developer-review.md


---

## Mandatory Document Structure (All Roles Must Follow)

# Post-Release Review — <Role Name>

## 1. Role Context

- What was my official scope?
- What decisions did I own?
- What interfaces/contracts did I depend on?

Be explicit about boundaries and responsibilities.

---

## 2. What Went Well

Describe:

- Strong decisions
- Clear contracts
- Effective collaboration
- Good tooling/processes
- Risk mitigation that worked
- Early issue detection
- Cross-team alignment moments

Use concrete examples.

---

## 3. What Did Not Go Well

Describe:

- Misalignment or unclear scope
- Technical debt introduced
- Gaps in validation or verification
- Communication breakdowns
- Incorrect assumptions
- Delays caused by missing contracts or unclear requirements

Avoid emotional language. Be analytical.

---

## 4. Root Cause Analysis

For each major issue:

- What was the actual root cause?
- Was it process, technical design, unclear ownership, or environment-related?
- Was detection late? Why?

Focus on systemic patterns, not individuals.

---

## 5. Lessons Learned

List actionable insights such as:

- What I will do earlier next time
- What validation should happen before implementation
- What documentation must exist before coding
- What contract clarity is required
- Where automated safeguards should exist

Lessons must be transferable to future projects.

---

## 6. What I Would Do Differently Next Time

Provide specific improvements such as:

- Earlier OpenAPI alignment
- Explicit UX-to-API mapping review
- Stronger typing/contracts
- More defensive backend validation
- Earlier test case definition
- Better environment parity

Be concrete and execution-focused.

---

## 7. Cross-Role Collaboration Observations

Reflect on:

- Where collaboration worked well
- Where handoffs failed
- Where expectations were misaligned
- Where documentation prevented issues
- Where missing documentation caused rework

Include suggestions to improve coordination between roles.

---

## 8. Process Improvements for Future Projects

Provide structured recommendations:

### Planning Phase
What should be added/changed?

### Design Phase
What guardrails should exist?

### Implementation Phase
What checkpoints are required?

### Testing Phase
What must be mandatory before release?

### Release Phase
What verification gates must exist?

---

## 9. Risk Areas That Should Be Monitored in Future Releases

Identify patterns such as:

- Auth edge cases
- Input validation risks
- UUID parsing assumptions
- RBAC drift
- UI-parity regressions
- Contract drift between OpenAPI and runtime

Be specific to your domain.

---

## 10. Final Summary

In 5–10 bullet points:
- The most important improvements
- The highest-risk recurring pattern
- The single most impactful change for future success

---

# Role-Specific Focus Areas

Each role must additionally emphasize the following:

---

## Architect
Focus on:
- Contract clarity
- System boundaries
- Cross-service cohesion
- Architectural decision timing
- Where architectural enforcement was weak

---

## Business Analyst
Focus on:
- Requirement clarity
- Acceptance criteria precision
- Edge-case identification
- Stakeholder alignment
- Requirement-to-test traceability

---

## Code Builder
Focus on:
- Implementation correctness
- Contract enforcement
- Validation coverage
- Error envelope determinism
- Defensive coding practices

---

## Coding Optimizer
Focus on:
- Code quality patterns
- Maintainability
- Performance implications
- Refactor timing
- Missed optimization opportunities

---

## Critical Reviewer
Focus on:
- Review depth
- Blind spots in PR review
- Systemic patterns missed
- Repeated issues not escalated

---

## Database Architect
Focus on:
- Schema safety
- Casting assumptions (e.g., UUID)
- Query resilience
- Index coverage
- Migration validation

---

## Designer
Focus on:
- Design-to-implementation drift
- Visual parity gaps
- Component consistency
- Documentation sufficiency

---

## DevOps
Focus on:
- Environment parity
- Deployment safety
- Observability gaps
- Missing monitoring alerts
- CI gate strength

---

## Frontend Developer
Focus on:
- Route logic correctness
- Client-side validation gaps
- UX parity implementation fidelity
- State management clarity

---

## Test Manager
Focus on:
- Regression coverage sufficiency
- Test planning timing
- Risk-based prioritization accuracy
- Missed scenario detection

---

## Tester
Focus on:
- Edge-case discovery
- Environment instability
- Reproducibility issues
- Contract mismatch detection

---

## UX Designer
Focus on:
- IA clarity
- Interaction model alignment
- Stage transparency
- Obligation gating correctness
- Copy precision in onboarding flows

---

# Quality Requirements

Each document must:

- Avoid generic statements like “communication could be better”
- Include at least 5 concrete, specific examples
- Include at least 5 actionable improvements
- Be at least 800–1200 words
- Be structured exactly as defined above
- Not copy content from other roles
- Reflect the unique perspective of the role

---

# Tone Guidelines

- Professional
- Analytical
- Constructive
- Honest
- System-oriented (not person-oriented)
- Improvement-driven

---

# Prohibited Content

- Blame assignment to individuals
- Emotional language
- Vague generalizations
- Repetition of requirement summary instead of reflection
- One-paragraph retrospectives

---

# Completion Criteria

The retrospective phase is complete only when:

1. Every role has produced a structured review.
2. All documents follow the defined template.
3. Each document contains concrete examples and actionable improvements.
4. Cross-role collaboration insights are included.
5. Documents are stored in `/retrospective`.