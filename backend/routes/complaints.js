// backend/routes/complaints.js
const express = require('express');
const router = express.Router();
const {
  getComplaints, getComplaintById, createComplaint,
  upvoteComplaint, addComment, rateComplaint, updateOwnStatus,
} = require('../controllers/complaintController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', getComplaints);
router.post('/', upload.single('image'), createComplaint);
router.get('/:id', getComplaintById);
router.patch('/:id/status', updateOwnStatus);
router.post('/:id/upvote', upvoteComplaint);
router.post('/:id/comments', addComment);
router.post('/:id/rating', rateComplaint);

module.exports = router;
