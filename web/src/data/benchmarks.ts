// Benchmark results for the trust0-vision-1 launch post.
// Generated from experiments/ai-detect/results.json (1,380 images, RTX 3080 Laptop, 0.5 threshold).

export type Condition = 'original' | 'social' | 'repost'

export type ConditionResult = {
  auc: number
  accuracy: number
  aiCaught: number
  realFlagged: number
  realFacesFlagged: number
  msPerImage: number
  byGenerator: Record<string, number>
}

export type BenchmarkModel = {
  id: string
  name: string
  ours: boolean
  color: string
  results: Record<Condition, ConditionResult>
}

export const conditions: { id: Condition; label: string; detail: string }[] = [
  { id: 'original', label: 'Original', detail: 'As downloaded' },
  { id: 'social', label: 'Social', detail: 'Longest side 1080 px, JPEG quality 75' },
  { id: 'repost', label: 'Repost', detail: 'Social copy shrunk to 720 px, JPEG quality 60' },
]

// Display order, with the number of test images for each generator
export const generators: { id: string; label: string; count: number }[] = [
  { id: 'FLUX.2-dev', label: 'FLUX.2 [dev]', count: 150 },
  { id: 'FLUX.1-dev', label: 'FLUX.1 [dev]', count: 60 },
  { id: 'FLUX.1-dev-faces', label: 'FLUX.1 faces', count: 150 },
  { id: 'Midjourney-v6', label: 'Midjourney v6', count: 150 },
  { id: 'Midjourney', label: 'Midjourney v5', count: 60 },
  { id: 'SD15', label: 'Stable Diffusion 1.5', count: 60 },
  { id: 'Wukong', label: 'Wukong', count: 60 },
  { id: 'GLIDE', label: 'GLIDE', count: 60 },
  { id: 'BigGAN', label: 'BigGAN', count: 60 },
  { id: 'VQDM', label: 'VQDM', count: 60 },
  { id: 'ADM', label: 'ADM', count: 60 },
]

export const models: BenchmarkModel[] = [
  {
    id: 'trust0-vision-1',
    name: 'trust0-vision-1',
    ours: true,
    color: 'var(--primary)',
    results: {
      original: {
        auc: 0.94,
        accuracy: 0.859,
        aiCaught: 0.813,
        realFlagged: 0.043,
        realFacesFlagged: 0.05,
        msPerImage: 20.7,
        byGenerator: { 'FLUX.2-dev': 0.99, 'FLUX.1-dev': 1.0, 'FLUX.1-dev-faces': 0.93, 'Midjourney-v6': 1.0, 'Midjourney': 1.0, 'SD15': 0.93, 'Wukong': 0.95, 'GLIDE': 0.78, 'BigGAN': 0.27, 'VQDM': 0.18, 'ADM': 0.18 },
      },
      social: {
        auc: 0.978,
        accuracy: 0.881,
        aiCaught: 0.844,
        realFlagged: 0.063,
        realFacesFlagged: 0.0,
        msPerImage: 21.6,
        byGenerator: { 'FLUX.2-dev': 0.97, 'FLUX.1-dev': 1.0, 'FLUX.1-dev-faces': 0.93, 'Midjourney-v6': 1.0, 'Midjourney': 1.0, 'SD15': 0.9, 'Wukong': 1.0, 'GLIDE': 0.77, 'BigGAN': 0.77, 'VQDM': 0.27, 'ADM': 0.15 },
      },
      repost: {
        auc: 0.988,
        accuracy: 0.815,
        aiCaught: 0.727,
        realFlagged: 0.003,
        realFacesFlagged: 0.0,
        msPerImage: 21.4,
        byGenerator: { 'FLUX.2-dev': 0.89, 'FLUX.1-dev': 0.97, 'FLUX.1-dev-faces': 0.5, 'Midjourney-v6': 0.99, 'Midjourney': 1.0, 'SD15': 0.75, 'Wukong': 0.87, 'GLIDE': 0.7, 'BigGAN': 0.7, 'VQDM': 0.23, 'ADM': 0.08 },
      },
    },
  },
  {
    id: 'smogy',
    name: 'Smogy',
    ours: false,
    color: 'var(--chart-3)',
    results: {
      original: {
        auc: 0.843,
        accuracy: 0.728,
        aiCaught: 0.681,
        realFlagged: 0.12,
        realFacesFlagged: 0.29,
        msPerImage: 10.9,
        byGenerator: { 'FLUX.2-dev': 0.65, 'FLUX.1-dev': 0.98, 'FLUX.1-dev-faces': 0.95, 'Midjourney-v6': 0.69, 'Midjourney': 0.75, 'SD15': 0.88, 'Wukong': 0.95, 'GLIDE': 0.5, 'BigGAN': 0.15, 'VQDM': 0.33, 'ADM': 0.28 },
      },
      social: {
        auc: 0.69,
        accuracy: 0.694,
        aiCaught: 0.789,
        realFlagged: 0.31,
        realFacesFlagged: 0.89,
        msPerImage: 7.2,
        byGenerator: { 'FLUX.2-dev': 0.64, 'FLUX.1-dev': 0.9, 'FLUX.1-dev-faces': 0.94, 'Midjourney-v6': 0.71, 'Midjourney': 0.58, 'SD15': 0.83, 'Wukong': 0.95, 'GLIDE': 0.77, 'BigGAN': 0.85, 'VQDM': 0.83, 'ADM': 0.8 },
      },
      repost: {
        auc: 0.676,
        accuracy: 0.701,
        aiCaught: 0.818,
        realFlagged: 0.343,
        realFacesFlagged: 0.94,
        msPerImage: 7.0,
        byGenerator: { 'FLUX.2-dev': 0.63, 'FLUX.1-dev': 0.92, 'FLUX.1-dev-faces': 0.97, 'Midjourney-v6': 0.73, 'Midjourney': 0.52, 'SD15': 0.82, 'Wukong': 0.93, 'GLIDE': 0.85, 'BigGAN': 0.93, 'VQDM': 0.93, 'ADM': 0.95 },
      },
    },
  },
  {
    id: 'ateeqq',
    name: 'Ateeqq',
    ours: false,
    color: 'var(--chart-4)',
    results: {
      original: {
        auc: 0.7,
        accuracy: 0.65,
        aiCaught: 0.589,
        realFlagged: 0.203,
        realFacesFlagged: 0.27,
        msPerImage: 6.3,
        byGenerator: { 'FLUX.2-dev': 0.77, 'FLUX.1-dev': 0.95, 'FLUX.1-dev-faces': 0.94, 'Midjourney-v6': 0.62, 'Midjourney': 0.58, 'SD15': 0.35, 'Wukong': 0.58, 'GLIDE': 0.52, 'BigGAN': 0.12, 'VQDM': 0.17, 'ADM': 0.05 },
      },
      social: {
        auc: 0.703,
        accuracy: 0.649,
        aiCaught: 0.56,
        realFlagged: 0.213,
        realFacesFlagged: 0.07,
        msPerImage: 6.1,
        byGenerator: { 'FLUX.2-dev': 0.81, 'FLUX.1-dev': 0.95, 'FLUX.1-dev-faces': 0.76, 'Midjourney-v6': 0.63, 'Midjourney': 0.58, 'SD15': 0.5, 'Wukong': 0.67, 'GLIDE': 0.3, 'BigGAN': 0.03, 'VQDM': 0.17, 'ADM': 0.0 },
      },
      repost: {
        auc: 0.769,
        accuracy: 0.605,
        aiCaught: 0.451,
        realFlagged: 0.113,
        realFacesFlagged: 0.0,
        msPerImage: 5.9,
        byGenerator: { 'FLUX.2-dev': 0.75, 'FLUX.1-dev': 0.95, 'FLUX.1-dev-faces': 0.27, 'Midjourney-v6': 0.73, 'Midjourney': 0.58, 'SD15': 0.35, 'Wukong': 0.5, 'GLIDE': 0.13, 'BigGAN': 0.0, 'VQDM': 0.07, 'ADM': 0.0 },
      },
    },
  },
  {
    id: 'umm-maybe',
    name: 'umm-maybe',
    ours: false,
    color: 'var(--chart-5)',
    results: {
      original: {
        auc: 0.596,
        accuracy: 0.509,
        aiCaught: 0.395,
        realFlagged: 0.273,
        realFacesFlagged: 0.21,
        msPerImage: 7.9,
        byGenerator: { 'FLUX.2-dev': 0.37, 'FLUX.1-dev': 0.3, 'FLUX.1-dev-faces': 0.4, 'Midjourney-v6': 0.11, 'Midjourney': 0.35, 'SD15': 0.72, 'Wukong': 0.92, 'GLIDE': 0.35, 'BigGAN': 0.55, 'VQDM': 0.43, 'ADM': 0.32 },
      },
      social: {
        auc: 0.612,
        accuracy: 0.505,
        aiCaught: 0.396,
        realFlagged: 0.123,
        realFacesFlagged: 0.56,
        msPerImage: 7.0,
        byGenerator: { 'FLUX.2-dev': 0.22, 'FLUX.1-dev': 0.25, 'FLUX.1-dev-faces': 0.59, 'Midjourney-v6': 0.11, 'Midjourney': 0.22, 'SD15': 0.48, 'Wukong': 0.65, 'GLIDE': 0.63, 'BigGAN': 0.68, 'VQDM': 0.42, 'ADM': 0.5 },
      },
      repost: {
        auc: 0.617,
        accuracy: 0.517,
        aiCaught: 0.413,
        realFlagged: 0.11,
        realFacesFlagged: 0.58,
        msPerImage: 6.9,
        byGenerator: { 'FLUX.2-dev': 0.24, 'FLUX.1-dev': 0.27, 'FLUX.1-dev-faces': 0.63, 'Midjourney-v6': 0.11, 'Midjourney': 0.12, 'SD15': 0.53, 'Wukong': 0.58, 'GLIDE': 0.7, 'BigGAN': 0.85, 'VQDM': 0.4, 'ADM': 0.5 },
      },
    },
  },
]
