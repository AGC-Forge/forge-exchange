// ============================================================
// Human Behavior Engine — worker/behavior/behavior-engine.ts
// Simulate realistic human interaction: mouse, scroll, click, idle
// ============================================================

import type { Page } from "playwright";
import type { WorkerLogger } from "../utils/logger.js";

export interface BehaviorProfile {
  mouseMovement: boolean;
  mouseSpeed: "slow" | "normal" | "fast";
  scrollEnabled: boolean;
  scrollDepth: number; // percent 0-100
  internalLinkClick: boolean;
  linkClickRate: number; // percent
  idlePauseEnabled: boolean;
  tabSwitching: boolean;
  keyboardTyping: boolean;
  customClickEnabled: boolean;
  customClickTargets: CustomClickTarget[];
  customClickOrder: "sequential" | "random";
  customClickMaxPerSession: number;
  readingSpeed: "slow" | "normal" | "fast";
  attentionSpan: number; // percent
}

export interface CustomClickTarget {
  selector: string;
  clickRate: number; // percent
  waitBefore: number; // ms
  waitAfter: number; // ms
  description?: string;
}

interface BezierPoint {
  x: number;
  y: number;
}

export class HumanBehaviorEngine {
  private logger: WorkerLogger;

  constructor(logger: WorkerLogger) {
    this.logger = logger;
  }

  // ── Main simulate entry point ─────────────────────────────
  async simulate(
    page: Page,
    profile: BehaviorProfile,
    durationMs: number,
  ): Promise<void> {
    const startTime = Date.now();

    this.logger.info("Starting human behavior simulation", {
      duration: durationMs,
      scrollDepth: profile.scrollDepth,
    });

    // Parallel: reading time + behavior actions
    await Promise.race([
      this.waitMs(durationMs),
      this.runBehaviorLoop(page, profile, startTime, durationMs),
    ]);

    this.logger.info("Human behavior simulation complete", {
      elapsed: Date.now() - startTime,
    });
  }

  // ── Behavior loop ─────────────────────────────────────────
  private async runBehaviorLoop(
    page: Page,
    profile: BehaviorProfile,
    startTime: number,
    durationMs: number,
  ): Promise<void> {
    const elapsed = () => Date.now() - startTime;
    let customClicksDone = 0;

    // 1. Initial page load pause (simulate reading above fold)
    await this.randomSleep(800, 2000);

    // 2. Mouse movement on entry
    if (profile.mouseMovement) {
      await this.naturalMouseEntry(page, profile.mouseSpeed);
    }

    // 3. Scroll through page
    if (profile.scrollEnabled && elapsed() < durationMs) {
      await this.realisticScroll(
        page,
        profile.scrollDepth,
        profile.readingSpeed,
      );
    }

    // 4. Custom element clicks
    if (
      profile.customClickEnabled &&
      profile.customClickTargets.length > 0 &&
      customClicksDone < profile.customClickMaxPerSession &&
      elapsed() < durationMs
    ) {
      const targets =
        profile.customClickOrder === "random"
          ? this.shuffle([...profile.customClickTargets])
          : [...profile.customClickTargets];

      for (const target of targets) {
        if (customClicksDone >= profile.customClickMaxPerSession) break;
        if (elapsed() >= durationMs) break;

        if (this.roll(target.clickRate)) {
          await this.waitMs(target.waitBefore);
          const clicked = await this.clickElement(page, target.selector);
          if (clicked) {
            customClicksDone++;
            this.logger.info(
              `Custom click: ${target.description ?? target.selector}`,
            );
            await this.waitMs(target.waitAfter);
          }
        }
      }
    }

    // 5. Internal link click
    if (
      profile.internalLinkClick &&
      this.roll(profile.linkClickRate) &&
      elapsed() < durationMs
    ) {
      await this.clickInternalLink(page);
    }

    // 6. Idle pause
    if (profile.idlePauseEnabled && elapsed() < durationMs) {
      await this.idlePause(page);
    }

    // 7. Random mouse movement throughout
    if (profile.mouseMovement && elapsed() < durationMs) {
      await this.randomMouseWander(page, profile.mouseSpeed);
    }
  }

  // ── Natural mouse entry ───────────────────────────────────
  private async naturalMouseEntry(page: Page, speed: string): Promise<void> {
    try {
      const viewport = page.viewportSize() ?? { width: 1366, height: 768 };
      // Enter from random edge
      const startX = Math.random() < 0.5 ? 0 : viewport.width;
      const startY = Math.floor(Math.random() * viewport.height * 0.5);
      const endX = Math.floor(viewport.width * (0.3 + Math.random() * 0.4));
      const endY = Math.floor(viewport.height * (0.2 + Math.random() * 0.3));

      await this.moveMouse(page, startX, startY, endX, endY, speed);
    } catch {
      /* page may have navigated */
    }
  }

  // ── Realistic scroll ──────────────────────────────────────
  private async realisticScroll(
    page: Page,
    targetDepthPct: number,
    readingSpeed: string,
  ): Promise<void> {
    try {
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewport = page.viewportSize()?.height ?? 768;
      const targetPx = Math.floor(pageHeight * (targetDepthPct / 100));

      let currentY = 0;
      const readDelayMap = {
        slow: [2000, 5000],
        normal: [800, 2500],
        fast: [300, 1000],
      };
      const [minDelay, maxDelay] = readDelayMap[readingSpeed as keyof typeof readDelayMap] ?? [800, 2500];

      while (currentY < targetPx) {
        // Scroll step: 100-400px
        const step = Math.floor(100 + Math.random() * 300);
        currentY = Math.min(currentY + step, targetPx);

        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: "smooth" }),
          currentY,
        );
        await this.randomSleep(minDelay ?? 800, maxDelay ?? 2500);

        // Occasional scroll back up (re-reading)
        if (Math.random() < 0.12) {
          const backPx = Math.floor(50 + Math.random() * 150);
          currentY = Math.max(0, currentY - backPx);
          await page.evaluate(
            (y) => window.scrollTo({ top: y, behavior: "smooth" }),
            currentY,
          );
          await this.randomSleep(500, 1500);
        }
      }
    } catch {
      /* scroll error = page nav or closed */
    }
  }

  // ── Click custom element ──────────────────────────────────
  private async clickElement(page: Page, selector: string): Promise<boolean> {
    try {
      // Support multi-selector (comma separated)
      const selectors = selector.split(",").map((s) => s.trim());

      for (const sel of selectors) {
        const el = page.locator(sel).first();
        const count = await el.count();
        if (count === 0) continue;

        // Scroll element into view
        await el.scrollIntoViewIfNeeded({ timeout: 3000 });
        await this.randomSleep(200, 600);

        // Move mouse to element then click
        const box = await el.boundingBox();
        if (box) {
          const targetX = box.x + box.width * (0.3 + Math.random() * 0.4);
          const targetY = box.y + box.height * (0.3 + Math.random() * 0.4);
          await page.mouse.move(targetX, targetY);
          await this.randomSleep(100, 300);
        }

        await el.click({ timeout: 5000 });
        return true;
      }
    } catch (e: any) {
      this.logger.warn(`Custom click failed: ${selector}`, {
        error: e.message,
      });
    }
    return false;
  }

  // ── Click random internal link ────────────────────────────
  private async clickInternalLink(page: Page): Promise<void> {
    try {
      const hostname = new URL(page.url()).hostname;
      const links = await page
        .locator(`a[href*="${hostname}"], a[href^="/"]`)
        .all();

      if (links.length === 0) return;

      const link =
        links[Math.floor(Math.random() * Math.min(links.length, 10))];
      const box = await link?.boundingBox();
      if (!box) return;

      // Move to link naturally first
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
        steps: 10,
      });
      await this.randomSleep(200, 500);
      await link?.click({ timeout: 5000 });
      await this.randomSleep(1000, 3000);

      this.logger.info("Internal link clicked");
    } catch {
      /* link might navigate or be invalid */
    }
  }

  // ── Idle pause ────────────────────────────────────────────
  private async idlePause(page: Page): Promise<void> {
    // Simulate user stopping to read / distracted
    const idleMs = Math.floor(2000 + Math.random() * 8000);
    this.logger.info(`Idle pause: ${idleMs}ms`);

    // During idle: occasional micro mouse movement
    const microMoves = Math.floor(Math.random() * 3);
    for (let i = 0; i < microMoves; i++) {
      await this.randomSleep(idleMs / (microMoves + 1), idleMs / microMoves);
      try {
        const vp = page.viewportSize() ?? { width: 1366, height: 768 };
        const pos = await page.evaluate(() => ({
          x: window.scrollX,
          y: window.scrollY,
        }));
        await page.mouse.move(
          Math.floor(200 + Math.random() * (vp.width - 400)),
          Math.floor(100 + Math.random() * (vp.height - 200) + pos.y),
          { steps: 3 },
        );
      } catch {
        /* ignore */
      }
    }

    await this.randomSleep(1000, 3000);
  }

  // ── Random mouse wander ───────────────────────────────────
  private async randomMouseWander(page: Page, speed: string): Promise<void> {
    try {
      const vp = page.viewportSize() ?? { width: 1366, height: 768 };
      const moves = Math.floor(2 + Math.random() * 4);

      for (let i = 0; i < moves; i++) {
        const x = Math.floor(100 + Math.random() * (vp.width - 200));
        const y = Math.floor(100 + Math.random() * (vp.height - 200));
        await page.mouse.move(x, y, { steps: this.speedToSteps(speed) });
        await this.randomSleep(300, 900);
      }
    } catch {
      /* ignore */
    }
  }

  // ── Bezier mouse move ─────────────────────────────────────
  private async moveMouse(
    page: Page,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    speed: string,
  ): Promise<void> {
    const steps = this.speedToSteps(speed);
    const points = this.bezierPath(
      { x: fromX, y: fromY },
      { x: toX, y: toY },
      steps,
    );

    for (const pt of points) {
      await page.mouse.move(pt.x, pt.y);
      await this.waitMs(Math.floor(8 + Math.random() * 15));
    }
  }

  // ── Bezier curve path ─────────────────────────────────────
  private bezierPath(
    from: BezierPoint,
    to: BezierPoint,
    steps: number,
  ): BezierPoint[] {
    // Two random control points for natural curve
    const cp1 = {
      x: from.x + (to.x - from.x) * 0.25 + (Math.random() - 0.5) * 100,
      y: from.y + (to.y - from.y) * 0.25 + (Math.random() - 0.5) * 100,
    };
    const cp2 = {
      x: from.x + (to.x - from.x) * 0.75 + (Math.random() - 0.5) * 100,
      y: from.y + (to.y - from.y) * 0.75 + (Math.random() - 0.5) * 100,
    };

    const points: BezierPoint[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      points.push({
        x: Math.round(
          mt3 * from.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * to.x,
        ),
        y: Math.round(
          mt3 * from.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * to.y,
        ),
      });
    }
    return points;
  }

  // ── Helpers ───────────────────────────────────────────────
  private speedToSteps(speed: string): number {
    return speed === "slow" ? 40 : speed === "fast" ? 10 : 20;
  }

  private roll(percent: number): boolean {
    return Math.random() * 100 < percent;
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i] as T;
      arr[i] = arr[j] as T;
      arr[j] = temp;
    }
    return arr;
  }

  private waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private randomSleep(min: number, max: number): Promise<void> {
    return this.waitMs(Math.floor(min + Math.random() * (max - min)));
  }
}
