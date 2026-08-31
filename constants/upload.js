// Single source of truth for which content-types are accepted per upload type —
// shared by the validator (rejects unknown types before hitting S3) and the
// controller (derives the S3 object key's extension). Keeping one copy avoids
// the two ever silently drifting out of sync.
const EXTENSIONS_BY_CONTENT_TYPE = {
  image: {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  },
  video: {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  },
};

const DEFAULT_CONTENT_TYPE = { image: 'image/jpeg', video: 'video/mp4' };

module.exports = { EXTENSIONS_BY_CONTENT_TYPE, DEFAULT_CONTENT_TYPE };
