"use client";

import { useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HairColorConfig {
  id: string;
  label: string;
  hex: string;
  targetHue: number;
  saturationScale: number;
  lightnessOffset: number;
}

interface CharacterCanvasProps {
  config: HairColorConfig;
  /** 헤어 스타일 ID. HAIR_OVERLAYS 에 매핑된 id이면 오버레이 이미지를 합성한다 */
  hairStyle?: string;
  /** CSS 표시 너비 (px). 높이는 원본 이미지 비율로 자동 계산 */
  displayWidth?: number;
  className?: string;
  /** 첫 렌더링 완료 후 호출 */
  onReady?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HAIR_OVERLAYS: Record<string, string> = {
  ponytail: "/workspace/hair/ponytail.png",
  "ponytail-long": "/workspace/hair/ponytail-long.png",
  braids: "/workspace/hair/braids.png",
  "space-bun": "/workspace/hair/space-bun.png",
  wavy: "/workspace/hair/wavy.png",
};

// Flood fill: 시드 수집 범위(상단 20%)와 BFS 확장 상한(상단 32%)
// 눈/눈썹 영역(보통 30~38%)으로 번지는 것을 차단
const HAIR_SEED_Y_RATIO = 0.20;
const HAIR_FLOOD_MAX_Y_RATIO = 0.32;

// 갈색 계열 픽셀 판별 기준
const HAIR_HUE_MIN = 5;
const HAIR_HUE_MAX = 65;
const HAIR_SAT_MIN = 0.15;
const HAIR_LIGHT_MIN = 0.20;
const HAIR_LIGHT_MAX = 0.62;

// ── Component ─────────────────────────────────────────────────────────────────

export function CharacterCanvas({
  config,
  hairStyle = "none",
  displayWidth = 180,
  className,
  onReady,
}: CharacterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const originalPeopleDataRef = useRef<ImageData | null>(null);
  const compositeDataRef = useRef<ImageData | null>(null);
  const hairPixelSetRef = useRef<Uint8Array | null>(null);
  const isFirstRenderRef = useRef(true);

  // 1. people.png 최초 로드
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new window.Image();
    img.src = "/workspace/people.png";
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ratio = img.naturalHeight / img.naturalWidth;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${Math.round(displayWidth * ratio)}px`;

      ctx.drawImage(img, 0, 0);
      originalPeopleDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      void compositeAndApply(canvas, ctx, hairStyle, config);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. 헤어 스타일 변경 → 오버레이 재합성 + hair set 재계산 + 색 적용
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !originalPeopleDataRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    void compositeAndApply(canvas, ctx, hairStyle, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hairStyle]);

  // 3. 헤어 컬러 변경 → 기존 composite + hair set 재사용, 색만 다시 적용
  useEffect(() => {
    const canvas = canvasRef.current;
    const compositeData = compositeDataRef.current;
    const hairPixelSet = hairPixelSetRef.current;
    if (!canvas || !compositeData || !hairPixelSet) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyHairColor(ctx, compositeData, hairPixelSet, config);
  }, [config]);

  async function compositeAndApply(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    style: string,
    cfg: HairColorConfig,
  ) {
    const originalPeople = originalPeopleDataRef.current;
    if (!originalPeople) return;

    // people.png 복원
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(originalPeople.data), originalPeople.width, originalPeople.height),
      0,
      0,
    );

    // 오버레이 합성
    const overlayPath = HAIR_OVERLAYS[style];
    let overlayMask: Uint8Array | null = null;

    if (overlayPath) {
      try {
        const overlayImg = await loadImage(overlayPath);
        ctx.drawImage(overlayImg, 0, 0);
        overlayMask = buildOverlayMask(canvas, overlayImg);
      } catch {
        // 오버레이 로드 실패 시 무시
      }
    }

    const compositeData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    compositeDataRef.current = compositeData;

    if (style === "none") {
      hairPixelSetRef.current = new Uint8Array(canvas.width * canvas.height);
      fireOnReady();
      return;
    }

    // flood fill로 hair 픽셀 탐색 + 오버레이 마스크 병합
    const hairPixelSet = buildHairPixelSet(compositeData);
    if (overlayMask) {
      for (let i = 0; i < hairPixelSet.length; i++) {
        if (overlayMask[i]) hairPixelSet[i] = 1;
      }
    }
    hairPixelSetRef.current = hairPixelSet;

    if (process.env.NODE_ENV === "development") {
      console.log(`[hair] style="${style}" → ${hairPixelSet.reduce((a, b) => a + b, 0)}px`);
    }

    applyHairColor(ctx, compositeData, hairPixelSet, cfg);
    fireOnReady();
  }

  function fireOnReady() {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      onReadyRef.current?.();
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** 오버레이 이미지의 불투명 픽셀을 1로 표시한 마스크를 반환 */
function buildOverlayMask(canvas: HTMLCanvasElement, overlayImg: HTMLImageElement): Uint8Array {
  const tmp = document.createElement("canvas");
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  const tmpCtx = tmp.getContext("2d")!;
  tmpCtx.drawImage(overlayImg, 0, 0);
  const { data } = tmpCtx.getImageData(0, 0, canvas.width, canvas.height);

  const totalPixels = canvas.width * canvas.height;
  const mask = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    if (data[i * 4 + 3] > 10) mask[i] = 1;
  }
  return mask;
}

// ── Flood Fill ────────────────────────────────────────────────────────────────
//
// 이미지 상단 seed 영역에서 갈색 픽셀을 찾아 BFS로 확장
// → 머리와 연결된 픽셀만 추출, 옷 테두리 등 끊어진 픽셀은 자연 제외
// → BFS 확장을 상단 32% 이내로 제한해 눈/눈썹 영역으로 번지는 것을 차단

function isHairHSL(h: number, s: number, l: number): boolean {
  return (
    h >= HAIR_HUE_MIN && h <= HAIR_HUE_MAX &&
    s >= HAIR_SAT_MIN &&
    l >= HAIR_LIGHT_MIN && l <= HAIR_LIGHT_MAX
  );
}

function buildHairPixelSet(imageData: ImageData): Uint8Array {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const isHair = new Uint8Array(totalPixels);
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);

  const seedMaxY = Math.floor(height * HAIR_SEED_Y_RATIO);
  const floodMaxY = Math.floor(height * HAIR_FLOOD_MAX_Y_RATIO);
  let qHead = 0;
  let qTail = 0;

  // 시드 수집
  for (let y = 0; y <= seedMaxY; y++) {
    for (let x = 0; x < width; x++) {
      const pi = y * width + x;
      const di = pi * 4;
      if (data[di + 3] < 10) continue;
      const [h, s, l] = rgbToHsl(data[di], data[di + 1], data[di + 2]);
      if (isHairHSL(h, s, l) && !visited[pi]) {
        visited[pi] = 1;
        queue[qTail++] = pi;
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[hair] seeds: ${qTail}개 (상단 ${HAIR_SEED_Y_RATIO * 100}% 기준)`);
  }

  // BFS — 8방향 탐색
  while (qHead < qTail) {
    const pi = queue[qHead++];
    isHair[pi] = 1;

    const x = pi % width;
    const y = Math.floor(pi / width);

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= floodMaxY) continue;
        const npi = ny * width + nx;
        if (visited[npi]) continue;
        const ndi = npi * 4;
        if (data[ndi + 3] < 10) continue;
        const [h, s, l] = rgbToHsl(data[ndi], data[ndi + 1], data[ndi + 2]);
        if (isHairHSL(h, s, l)) {
          visited[npi] = 1;
          queue[qTail++] = npi;
        }
      }
    }
  }

  return isHair;
}

// ── Color Application ─────────────────────────────────────────────────────────

/** 눈동자·외곽선(매우 어두움) 또는 눈 흰자(무채색·밝음)는 색 교체 대상에서 제외 */
function isFacePixel(s: number, l: number): boolean {
  return l < 0.12 || (s < 0.08 && l > 0.78);
}

function applyHairColor(
  ctx: CanvasRenderingContext2D,
  originalData: ImageData,
  hairPixelSet: Uint8Array,
  config: HairColorConfig,
) {
  const imageData = new ImageData(
    new Uint8ClampedArray(originalData.data),
    originalData.width,
    originalData.height,
  );
  const d = imageData.data;

  for (let pi = 0; pi < hairPixelSet.length; pi++) {
    if (!hairPixelSet[pi]) continue;
    const di = pi * 4;
    const [, s, l] = rgbToHsl(d[di], d[di + 1], d[di + 2]);
    if (isFacePixel(s, l)) continue;
    const newS = clamp(s * config.saturationScale, 0, 1);
    const newL = clamp(l + config.lightnessOffset, 0, 1);
    const [nr, ng, nb] = hslToRgb(config.targetHue, newS, newL);
    d[di] = nr;
    d[di + 1] = ng;
    d[di + 2] = nb;
  }

  ctx.putImageData(imageData, 0, 0);
}

// ── Color Math ────────────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
