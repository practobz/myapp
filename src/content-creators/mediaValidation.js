const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const LINKEDIN_MAX_IMAGE_PIXELS = 36152320;
const INSTAGRAM_FEED_MIN_ASPECT_RATIO = 0.8;
const INSTAGRAM_FEED_MAX_ASPECT_RATIO = 1.91;
const YOUTUBE_RECOMMENDED_ASPECT_RATIO_MIN = 1.0;
const YOUTUBE_RECOMMENDED_ASPECT_RATIO_MAX = 2.0;

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const IMAGE_EXTENSIONS_STRICT = ['jpg', 'jpeg', 'png', 'gif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi', 'mkv'];
const YOUTUBE_VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm'];

function getFileExtension(fileName = '') {
  const parts = String(fileName).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

export function normalizePlatforms(platformValue) {
  if (!platformValue) return [];
  if (Array.isArray(platformValue)) {
    return platformValue
      .flatMap(value => String(value).split(','))
      .map(value => value.trim().toLowerCase())
      .filter(Boolean);
  }

  return String(platformValue)
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

function readImageMetadata(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth || 0;
      const height = image.naturalHeight || 0;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height, duration: null });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0, duration: null });
    };

    image.src = objectUrl;
  });
}

function readVideoMetadata(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.src = '';
    };

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve({ width, height, duration });
    };

    video.onerror = () => {
      cleanup();
      resolve({ width: 0, height: 0, duration: 0 });
    };

    video.src = objectUrl;
  });
}

function buildIssue(level, message, platform = '') {
  return {
    level,
    message,
    platform,
  };
}

export async function validateMediaForPlatforms(file, options = {}) {
  const platforms = normalizePlatforms(options.platforms || options.platform || []);
  const issues = [];

  if (!file) {
    issues.push(buildIssue('error', 'No file selected.'));
    return { blocked: true, issues, metadata: null };
  }

  if (!file.type || (!file.type.startsWith('image/') && !file.type.startsWith('video/'))) {
    issues.push(buildIssue('error', 'Only image and video files are supported.'));
    return { blocked: true, issues, metadata: null };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    issues.push(buildIssue('error', 'File is larger than the 100 MB upload limit used in this project.'));
  }

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const ext = getFileExtension(file.name);
  const metadata = isImage ? await readImageMetadata(file) : await readVideoMetadata(file);
  const aspectRatio = metadata.width && metadata.height ? metadata.width / metadata.height : 0;
  const pixelCount = metadata.width && metadata.height ? metadata.width * metadata.height : 0;

  const targets = platforms.length > 0 ? platforms : [];
  const includesInstagram = targets.includes('instagram');
  const includesFacebook = targets.includes('facebook');
  const includesLinkedIn = targets.includes('linkedin');
  const includesYouTube = targets.includes('youtube');

  if (includesYouTube) {
    if (isImage) {
      issues.push(buildIssue('error', 'YouTube uploads require a video file.'));
    } else if (isVideo && ext && !YOUTUBE_VIDEO_EXTENSIONS.includes(ext)) {
      issues.push(buildIssue('warning', 'YouTube recommends MP4, MOV, or WebM for uploads.'));
    }

    if (isVideo && aspectRatio) {
      if (aspectRatio < YOUTUBE_RECOMMENDED_ASPECT_RATIO_MIN || aspectRatio > YOUTUBE_RECOMMENDED_ASPECT_RATIO_MAX) {
        issues.push(buildIssue('warning', 'YouTube videos commonly work best near a 16:9 aspect ratio.'));
      }
    }
  }

  if (includesInstagram) {
    if (isImage && !IMAGE_EXTENSIONS_STRICT.includes(ext)) {
      issues.push(buildIssue('error', 'Instagram feed image publishing is safest with JPG or JPEG.'));
    }

    if (isImage && aspectRatio) {
      if (aspectRatio < INSTAGRAM_FEED_MIN_ASPECT_RATIO || aspectRatio > INSTAGRAM_FEED_MAX_ASPECT_RATIO) {
        issues.push(buildIssue('warning', 'Instagram feed images are usually best between 4:5 and 1.91:1.'));
      }
    }

    if (isVideo && aspectRatio) {
      if (aspectRatio < 0.56 || aspectRatio > 1.91) {
        issues.push(buildIssue('warning', 'Instagram videos may crop outside common feed ratios.'));
      }
    }
  }

  if (includesLinkedIn) {
    if (isImage && !IMAGE_EXTENSIONS.includes(ext)) {
      issues.push(buildIssue('error', 'LinkedIn image uploads support JPG, JPEG, PNG, GIF, and WebP only.'));
    }

    if (isImage && pixelCount && pixelCount > LINKEDIN_MAX_IMAGE_PIXELS) {
      issues.push(buildIssue('error', 'LinkedIn image uploads must stay under 36,152,320 pixels.'));
    }

    if (isVideo && ext && ext !== 'mp4') {
      issues.push(buildIssue('warning', 'LinkedIn video uploads are most reliable with MP4.'));
    }
  }

  if (includesFacebook) {
    if (isImage && !IMAGE_EXTENSIONS.includes(ext)) {
      issues.push(buildIssue('warning', 'Facebook image uploads are typically safest with JPG, PNG, GIF, or WebP.'));
    }

    if (isVideo && ext && ext !== 'mp4') {
      issues.push(buildIssue('warning', 'Facebook video publishing is most reliable with MP4.'));
    }
  }

  const blocked = issues.some(issue => issue.level === 'error');
  return { blocked, issues, metadata, aspectRatio, pixelCount };
}

export function hasMixedContent(files) {
  if (!files || files.length <= 1) return false;
  let hasImage = false;
  let hasVideo = false;
  for (const f of files) {
    const fileObj = f.file || f;
    const type = fileObj.type || f.type || '';
    if (type.startsWith('image/') || f.type === 'image') {
      hasImage = true;
    } else if (type.startsWith('video/') || f.type === 'video') {
      hasVideo = true;
    }
  }
  return hasImage && hasVideo;
}

export function hasMultipleVideos(files) {
  if (!files || files.length <= 1) return false;
  let videoCount = 0;
  for (const f of files) {
    const fileObj = f.file || f;
    const type = fileObj.type || f.type || '';
    if (type.startsWith('video/') || f.type === 'video') {
      videoCount++;
    }
  }
  return videoCount > 1;
}

export async function validateThumbnail(file, options = {}) {
  const platforms = normalizePlatforms(options.platforms || options.platform || []);
  const issues = [];

  if (!file) {
    issues.push(buildIssue('error', 'No thumbnail file selected.'));
    return { blocked: true, issues, metadata: null };
  }

  if (!file.type || !file.type.startsWith('image/')) {
    issues.push(buildIssue('error', 'Thumbnail must be an image.'));
    return { blocked: true, issues, metadata: null };
  }

  const metadata = await readImageMetadata(file);
  const aspectRatio = metadata.width && metadata.height ? metadata.width / metadata.height : 0;

  const targets = platforms.length > 0 ? platforms : [];
  const includesYouTube = targets.includes('youtube');
  const includesInstagram = targets.includes('instagram');

  if (includesYouTube) {
    const diff = Math.abs(aspectRatio - (16 / 9));
    if (diff > 0.05) {
      issues.push(buildIssue('warning', 'YouTube thumbnail aspect ratio should be 16:9 (1.78).'));
    }
  } else if (includesInstagram) {
    if (aspectRatio < 0.8 || aspectRatio > 1.91) {
      issues.push(buildIssue('warning', 'Instagram thumbnail/cover aspect ratio should be between 4:5 (0.8) and 1.91:1.'));
    }
  } else {
    const diff = Math.abs(aspectRatio - (16 / 9));
    if (diff > 0.1) {
      issues.push(buildIssue('warning', 'Recommended thumbnail aspect ratio is 16:9 (1.78).'));
    }
  }

  const blocked = issues.some(issue => issue.level === 'error');
  return { blocked, issues, metadata, aspectRatio };
}