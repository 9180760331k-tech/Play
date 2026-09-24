import { BEST_SCORE_STORAGE_KEY } from './config';

export function loadBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    if (raw == null || raw.trim() === '') return 0;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  try {
    if (!Number.isFinite(score) || score < 0) return;
    localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(Math.floor(score)));
  } catch {
    // Игра продолжается, даже если хранилище недоступно.
  }
}
