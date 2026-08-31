const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const Event = require('../models/event.model');
const s3Client = require('../config/s3');
const { EXTENSIONS_BY_CONTENT_TYPE, DEFAULT_CONTENT_TYPE } = require('../constants/upload');

const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

// Only these fields are ever read from req.body — prevents mass-assignment of
// unexpected keys (e.g. _id, createdBy, timestamps) regardless of what a client sends.
const pickInput = (body) => ({
  name: body.name,
  descriptions: body.descriptions,
  imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : undefined,
  videoUrls: Array.isArray(body.videoUrls) ? body.videoUrls : undefined,
});

const handleMongoError = (err, res) => {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Something went wrong' });
};

exports.createEvent = async (req, res) => {
  try {
    const input = pickInput(req.body);
    const event = await Event.create({
      ...input,
      createdBy: req.admin.id,
      updatedBy: req.admin.id,
    });
    res.status(201).json(event);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json(events);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(200).json(event);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const input = pickInput(req.body);
    Object.keys(input).forEach((key) => input[key] === undefined && delete input[key]);

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    Object.assign(event, input, { updatedBy: req.admin.id });
    await event.save();

    res.status(200).json(event);
  } catch (err) {
    handleMongoError(err, res);
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(200).json({ message: 'Event deleted' });
  } catch (err) {
    handleMongoError(err, res);
  }
};

// Generates a short-lived presigned S3 PUT URL so the frontend can upload the
// file directly to S3 (never through this server), and immediately records the
// resulting fileUrl on the event's imageUrls/videoUrls — the key is derived
// server-side, so the final URL is known before the upload itself happens.
exports.getSignedUploadUrl = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const { type } = req.body;
    const contentType = req.body.contentType || DEFAULT_CONTENT_TYPE[type];
    const extension = EXTENSIONS_BY_CONTENT_TYPE[type][contentType];

    const key = `events/${event._id}/${type}s/${crypto.randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
    });
    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    const targetField = type === 'image' ? 'imageUrls' : 'videoUrls';
    event[targetField].push(fileUrl);
    event.updatedBy = req.admin.id;
    await event.save();

    res.status(200).json({ uploadUrl, fileUrl, key, expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
