/* Trip production vocabulary. One definition of the states, comp kinds, occupancy types and
   term fields that every trip record and every renderer uses. Changing a value here changes
   every trip, every generated document and every check. */

/* What a priced itinerary line is actually worth, operationally. `client_word` is the single
   word a client-facing document prints next to the line; silence must never imply "booked". */
const LINE_STATES = {
  sourcing: { label: 'Sourcing', state: 'blocking', client_word: 'venue being finalised', description: 'Candidates are being shopped. Nothing is requested of a named supplier yet.' },
  requested: { label: 'Requested', state: 'blocking', client_word: 'requested', description: 'A request has gone out. No terms have come back.' },
  quoted: { label: 'Quoted', state: 'in_progress', client_word: 'quoted', description: 'The supplier has given a price and its terms. Nothing is held.' },
  held: { label: 'Held', state: 'in_progress', client_word: 'held', description: 'Space is held against a release date. Not paid.' },
  deposit_paid: { label: 'Deposit paid', state: 'in_progress', client_word: 'reserved', description: 'A deposit has been paid. A balance remains due.' },
  confirmed: { label: 'Confirmed', state: 'clear', client_word: 'confirmed', description: 'Supplier has confirmed for this date and headcount, and nothing is outstanding.' }
};

/* Two different things are called "comps" on a printed proposal and they move the price in
   opposite directions. They are never one number. */
const COMP_KINDS = {
  vendor_earned: { label: 'Vendor-earned comp', effect: 'reduces_cost', description: 'Free places a supplier grants on its own ratio, e.g. one per ten paid plus a driver.' },
  trip_granted: { label: 'Trip-granted comp', effect: 'increases_cost_per_paying_traveller', description: 'Free places the operator grants the client. Their cost is carried by the paying travellers.' }
};

const OCCUPANCY = ['quad', 'triple', 'double', 'single'];

/* How a supplier charges. A per-group fee and a per-person fee behave completely differently
   when headcount moves, so the basis travels with the amount. */
const COST_BASIS = {
  per_person: { label: 'Per person', scales_with_headcount: true },
  per_group: { label: 'Per group', scales_with_headcount: false },
  per_room_per_night: { label: 'Per room per night', scales_with_headcount: true },
  flat: { label: 'Flat fee', scales_with_headcount: false }
};

const SUPPLIER_CATEGORIES = ['transport', 'lodging', 'attraction', 'meal', 'venue', 'performance', 'service'];

const CHANNELS = ['web_form', 'email', 'phone', 'voicemail', 'in_person', 'portal'];

/* Where a fact in the trip record came from. A handwritten margin note is evidence with a
   different weight from a supplier's own email, and the record says which it was. */
const SOURCE_KINDS = {
  proposal_page: { label: 'Printed proposal page' },
  handwritten: { label: 'Handwritten margin note on a printed page' },
  supplier_email: { label: 'Email from or to the supplier' },
  quote_system: { label: 'Screen from the quote/registration system' },
  web_form: { label: 'Web form submission notification' },
  project_record: { label: 'Record in this repository' }
};

/* Supplier term fields a change actually trips. Anything not listed here is a note, not a term. */
const TERM_FIELDS = [
  'unit_price', 'minimum', 'comp_policy', 'deposit', 'balance_due_days',
  'final_headcount_due_business_days', 'payment_methods', 'cancellation', 'release_date', 'notes'
];

const lineState = value => LINE_STATES[value];
const isClear = value => Boolean(LINE_STATES[value]) && LINE_STATES[value].state === 'clear';
const clientWord = value => (LINE_STATES[value] || {}).client_word || 'status unrecorded';

module.exports = {
  LINE_STATES, COMP_KINDS, OCCUPANCY, COST_BASIS, SUPPLIER_CATEGORIES,
  CHANNELS, SOURCE_KINDS, TERM_FIELDS, lineState, isClear, clientWord
};
