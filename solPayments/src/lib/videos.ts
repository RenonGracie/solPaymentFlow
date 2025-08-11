export const VIDEO_BASE_URL = process.env.NEXT_PUBLIC_VIDEO_BASE_URL || '';

function buildVideoUrl(filename: string): string {
  return VIDEO_BASE_URL ? `${VIDEO_BASE_URL.replace(/\/$/, '')}/${filename}` : `/${filename}`;
}

export const VIDEOS = {
  onboarding16x9: buildVideoUrl('onboarding-video-16x9.mp4'),
  onboarding9x16: buildVideoUrl('onboarding-video-9x16.mp4'),
  howItWorks16x9: buildVideoUrl('how-it-works-16x9.mp4'),
  howItWorks9x16: buildVideoUrl('how-it-works-9x16.mp4'),
  emotionalWellBeing: buildVideoUrl('emotional-well-being.mp4'),
  measuringAnxiety: buildVideoUrl('measuring-anxiety.mp4'),
}; 