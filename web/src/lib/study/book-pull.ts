export const BOOK_PULL_FRACTION = 2 / 3;

type Transition = { from: number; to: number; started: number };

/** One selected book, with interruptible movements for both outgoing and incoming books. */
export class BookPullMotion {
  selectedId: string | null = null;
  private amounts = new Map<string, number>();
  private transitions = new Map<string, Transition>();
  readonly duration = 320;

  get moving() { return this.transitions.size > 0; }
  amount(id: string) { return this.amounts.get(id) ?? 0; }

  pick(id: string, now: number, instant = false): 'pull' | 'open' {
    this.update(now);
    if (id === this.selectedId) return 'open';
    if (this.selectedId) this.move(this.selectedId, 0, now, instant);
    this.selectedId = id;
    this.move(id, 1, now, instant);
    return 'pull';
  }

  clear(now: number, instant = false) {
    this.update(now);
    if (this.selectedId) this.move(this.selectedId, 0, now, instant);
    this.selectedId = null;
  }

  update(now: number) {
    for (const [id, movement] of this.transitions) {
      const t = Math.max(0, Math.min(1, (now - movement.started) / this.duration));
      this.amounts.set(id, movement.from + (movement.to - movement.from) * (1 - (1 - t) ** 3));
      if (t === 1) {
        this.transitions.delete(id);
        if (movement.to === 0) this.amounts.delete(id);
      }
    }
    return this.moving;
  }

  reset() { this.selectedId = null; this.amounts.clear(); this.transitions.clear(); }

  private move(id: string, to: number, now: number, instant: boolean) {
    const from = this.amount(id);
    if (instant || from === to) {
      this.transitions.delete(id);
      if (to === 0) this.amounts.delete(id); else this.amounts.set(id, to);
    } else this.transitions.set(id, { from, to, started: now });
  }
}
