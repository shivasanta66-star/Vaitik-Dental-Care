// Placeholder API layer — replace these with real calls to your backend.
// Every function returns a Promise so the UI does not change when they go live.

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

export const api = {
  // GET /api/slots?branch=&date=  → return null to use the local slot generator.
  getSlots: async (_branch, _date) => null,

  // POST /api/bookings  → resolves with a booking reference.
  createBooking: async (_payload, { fail = false } = {}) => {
    await wait(1200);
    if (fail) throw new Error('network');
    return 'VDC-' + String(Date.now()).slice(-6);
  },

  // POST /api/payments
  payFee: async (_ref) => true,

  // POST /api/auth/login
  login: async (_email, _password) => true,

  // PATCH /api/bookings/:id
  updateAppointment: async (_id, _patch) => true,

  // PUT /api/{treatments|reviews|gallery|schedule|settings}
  save: async (_what, _data) => true,
};
