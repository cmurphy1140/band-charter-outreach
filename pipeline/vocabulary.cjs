/* One definition of the tiers, layers and states every pipeline case uses.
   Stage numbers refer to the five-stage client acquisition pipeline; see pipeline/README.md. */

const EVIDENCE_TIERS = {
  1: {
    key: 'documented',
    label: 'Documented',
    description: 'Primary contract, executed agreement, licence, venue document or published brochure held by the business.',
    requires: 'source_ids',
    customer_safe: true
  },
  2: {
    key: 'business_reported',
    label: 'Employee-reported',
    description: 'Verbal estimate, relayed report or unverified business statement, including working sheets not established as final.',
    requires: 'source_ids',
    customer_safe: false
  },
  3: {
    key: 'inference',
    label: 'Inference / recommendation',
    description: 'Analytical conclusion drawn from evidence. Reasoning is recorded in "basis".',
    requires: 'basis',
    customer_safe: false
  },
  4: {
    key: 'illustrative',
    label: 'Illustrative',
    description: 'Synthetic teaching or demonstration record. Never a real account, approval, payment or booking.',
    requires: 'illustrative',
    customer_safe: false
  },
  5: {
    key: 'unknown',
    label: 'Unknown',
    description: 'Missing commercial fact. "needed_for" records the action that makes resolving it necessary.',
    requires: 'needed_for',
    customer_safe: false
  }
};

const REUSE = {
  'customer-safe': 'May appear in an audience-facing deliverable, with its qualification carried along.',
  'internal-only': 'Stays in internal records, the decision register and working notes.'
};

/* Stage 2 entity disaggregation. Each layer names the parent it must resolve to. */
const ENTITY_LAYERS = {
  account: { label: 'Institution / account', parent: null, crm_object: 'Account' },
  unit: { label: 'Unit / ensemble', parent: 'account_id', crm_object: 'Deal field' },
  contact: { label: 'Adult role / contact', parent: 'account_id', crm_object: 'Contact' },
  opportunity: { label: 'Opportunity / deal', parent: 'account_id', crm_object: 'Deal' }
};

/* Stage 3 parallel status vectors. Values classify as blocking, in_progress or clear.
   "Not started", "Not sent", "Not checked" and "Declined" extend the original value lists
   so a case that has not begun a vector is representable without inventing progress. */
const STATUS_VECTORS = {
  proposal_readiness: {
    label: 'Proposal readiness',
    values: { 'Not started': 'blocking', Drafted: 'in_progress', Issued: 'clear', 'Revision required': 'blocking' }
  },
  institutional_approval: {
    label: 'Institutional approval',
    values: { 'Not started': 'blocking', 'Pending board': 'in_progress', Approved: 'clear', Declined: 'blocking' }
  },
  contract_execution: {
    label: 'Contract execution',
    values: { 'Not sent': 'blocking', Sent: 'in_progress', Executed: 'clear', Unsigned: 'blocking' }
  },
  payment_state: {
    label: 'Payment / deposit',
    values: { Unquoted: 'blocking', Pending: 'in_progress', Settled: 'clear' }
  },
  supplier_feasibility: {
    label: 'Supplier / logistics feasibility',
    values: { 'Not checked': 'blocking', Feasible: 'clear', 'Supplier objection': 'blocking', Revised: 'in_progress' }
  }
};

/* Stage 4 audience deliverables. */
const DELIVERABLES = {
  client_event_sheet: { label: 'Client event sheet', audience: 'Director or client contact' },
  approver_faq: { label: 'Executive / approver FAQ', audience: 'Budget holder or approving body' },
  partner_sheet: { label: 'Partner co-marketing sheet', audience: 'Tour or distribution partner' },
  proposal_template: { label: 'Proposal template', audience: 'Client, once an offer basis exists' }
};

/* Stage 5 walkthrough moments. */
const MOMENTS = [
  { number: 1, key: 'understand_event', label: 'Understand the event', expects: 'Fact spine' },
  { number: 2, key: 'inspect_opportunity', label: 'Inspect one opportunity', expects: 'Researched profile with primary sources' },
  { number: 3, key: 'see_material', label: 'See the conversation material', expects: 'Matching event sheet and FAQ' },
  { number: 4, key: 'follow_next_action', label: 'Follow the next action', expects: 'Traced approval or logistics scenario' },
  { number: 5, key: 'take_away', label: 'Take the deliverables away', expects: 'Exportable documents or workbook' }
];

/* Stage 4 CRM field map. Custom fields travel with every exported row. */
const CRM_CUSTOM_FIELDS = ['Source URL', 'Evidence Class', 'Verification Date'];

const SOURCE_KINDS = {
  primary_page: { label: 'Official school, district or program page', publishes_contacts: true },
  organization_site: { label: 'Organization or company website', publishes_contacts: true },
  organizer_archive: { label: 'Event organizer archive', publishes_contacts: false },
  business_document: { label: 'Business document held locally', publishes_contacts: false },
  business_photograph: { label: 'Photographed business document', publishes_contacts: false },
  employee_report: { label: 'Employee report relayed through the project', publishes_contacts: false },
  project_record: { label: 'Project record in this repository', publishes_contacts: false }
};

const tierOf = value => EVIDENCE_TIERS[value];
const vectorClass = (vector, value) => STATUS_VECTORS[vector] && STATUS_VECTORS[vector].values[value];

module.exports = {
  EVIDENCE_TIERS, REUSE, ENTITY_LAYERS, STATUS_VECTORS, DELIVERABLES, MOMENTS,
  CRM_CUSTOM_FIELDS, SOURCE_KINDS, tierOf, vectorClass
};
