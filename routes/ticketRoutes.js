const express  = require('express');
const router   = express.Router();
const protect  = require('../middleware/protect');
const {
  createTicket, getTickets, getTicketById,
  updateTicket, deleteTicket
} = require('../controllers/ticketController');

router.route('/')
  .post(protect, createTicket)
  .get(protect, getTickets);

router.route('/:id')
  .get(protect, getTicketById)
  .put(protect, updateTicket)
  .delete(protect, deleteTicket);

module.exports = router;
