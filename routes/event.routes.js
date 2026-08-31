const express = require('express');
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getSignedUploadUrl,
} = require('../controllers/event.controller');
const {
  validateCreateEvent,
  validateUpdateEvent,
  validateIdParam,
  validateSignedUploadUrl,
  handleValidation,
} = require('../validators/event.validator');
const authenticate = require('../middlewares/auth.middleware');

// Public: list + single-event lookup for the marketing site's gallery/video
// dialog. Nothing on an Event is sensitive (createdBy/updatedBy are just
// admin ids), so these reuse getEvents/getEventById as-is rather than
// exposing the full admin CRUD surface (create/update/delete) to anonymous
// visitors.
router.get('/public', getEvents);
router.get('/public/:id', validateIdParam, handleValidation, getEventById);

// Every other event route requires a valid admin JWT.
router.use(authenticate);

router.post('/', validateCreateEvent, handleValidation, createEvent);
router.get('/', getEvents);
router.get('/:id', validateIdParam, handleValidation, getEventById);
router.put('/:id', validateIdParam, validateUpdateEvent, handleValidation, updateEvent);
router.delete('/:id', validateIdParam, handleValidation, deleteEvent);
router.post('/:id/signed-url', validateSignedUploadUrl, handleValidation, getSignedUploadUrl);

module.exports = router;
