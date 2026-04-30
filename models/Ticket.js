const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  issueTitle:  { type: String, required: true },
  description: { type: String },
  status:   { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  employee:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Ticket', TicketSchema);
