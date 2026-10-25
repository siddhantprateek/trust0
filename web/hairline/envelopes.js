/**
 * Envelopes: a photo card wrapped in four envelopes, one per repost, each a
 * little larger than the one inside it. The pointer's x peels them back, the
 * outermost first, each sliding out along its own spring until they lie in a
 * trail leading back to the card. Each envelope carries a stamp with its
 * repost number in dots. The one on top of what is left takes the bright
 * edge; once all are peeled, the card does. At rest the outermost stamp is
 * bright. The slider is the trail's spacing.
 *
 * The pattern: scrub. One spring per envelope, a progress read from the
 * pointer's x alone, and a rest that is a slight fan.
 */
const {
  Cam, circ, clamp, facing, fit, flatDot, lerp, mk, open, place, poly, prism, proj, rings,
  rrect, spring, stepS, disposer, pointer, put, register, solid,
} = HL;

const N = 4, CW = 40, CD = 28, CT = 3, TH = 2.6, BASE = 46, DTOP = 20;
const size = (k) => [CW + 8 * k, CD + 6 * k];
const z0 = (k) => CT + (k - 1) * TH;
/** At rest the stack sits askew: the inner envelopes poke out past the outer ones in a little stair. */
const REST = (k) => (N - k) * 7;
const HORIZON = [];
for (let x = -CW / 2 + 4; x <= CW / 2 - 4; x += 2) HORIZON.push([x, 4 + 3 * Math.sin(x / 6)]);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gap = value, p = null;

  // Fitted to the outermost envelope at rest and the trail at its widest spacing.
  const C = Cam(45, 0.5, 2.3);
  const xe = BASE + (N - 1) * DTOP + size(N)[0] / 2, ye = size(N)[1] / 2, zt = z0(N) + TH;
  const xs = -size(N)[0] / 2;
  fit(C, [[xs, -ye, 0], [xe, -ye, 0], [xe, ye, 0], [xs, ye, 0], [xs, -ye, zt], [xe, ye, zt]], 200, 166);
  const P = proj(C), front = facing(C);

  // Bottom to top: the card, then the envelopes from the innermost out.
  const g = mk("g", {}, svg);
  const card = solid(g);
  const [cr, ci] = rings(-CW / 2, -CD / 2, CW / 2, CD / 2, 3, 1);
  put(card, prism(P, front, cr, ci, 0, CT));
  mk("path", { d: open(HORIZON.map(([x, y]) => P(x, y, CT))), class: "nf lo" }, g);
  mk("path", { d: poly(circ(3.2, 16).map((q) => P(8 + q.u, -5 + q.v, CT))), class: "nf lo" }, g);

  const envs = [];
  for (let k = 1; k <= N; k++) {
    const grp = mk("g", {}, g), body = solid(grp);
    const flap = mk("path", { class: "nf lo" }, grp), stamp = mk("path", { class: "nf" }, grp);
    const dots = [];
    for (let j = 0; j < k; j++) dots.push(flatDot(grp, C, 0.6, "dot m"));
    envs.push({ k, body, flap, stamp, dots, sp: spring(REST(k)), drawn: NaN });
  }

  /** Envelope k slid out to x = s: its body, the flap's two folds, and a stamp holding k dots on the near
   *  left corner, the one the next envelope out leaves showing. */
  function draw(e) {
    const s = e.sp.x;
    if (s === e.drawn) return;
    e.drawn = s;
    const [w, d] = size(e.k), x0 = s - w / 2, x1 = s + w / 2, y0 = -d / 2, y1 = d / 2, zt = z0(e.k) + TH;
    const [r, b] = rings(x0, y0, x1, y1, 3, 1);
    put(e.body, prism(P, front, r, b, z0(e.k), zt));
    e.flap.setAttribute("d", open([P(x0 + 2, y0 + 2, zt), P(s, y0 + d * 0.55, zt), P(x1 - 2, y0 + 2, zt)]));
    e.stamp.setAttribute("d", poly(rrect(x0 + 3, y1 - 10, x0 + 12, y1 - 3, 1.2, 3).map((q) => P(q.u, q.v, zt))));
    e.dots.forEach((el, j) => place(el, P(x0 + 7.5 + ((j % 2) - 0.5) * 3, y1 - 6.5 + (Math.floor(j / 2) - 0.5) * 3 * (e.k > 2), zt)));
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const e of envs) { if (stepS(e.sp, dt)) m = true; draw(e); }
    return m;
  });
  bag.add(B.unregister);

  /** p runs 0 to N: envelope k slides out as p passes N - k, the outermost first. */
  function retarget() {
    for (const e of envs) {
      const far = BASE + (e.k - 1) * gap;
      e.sp.t = p === null ? REST(e.k) : lerp(REST(e.k), far, clamp(p - (N - e.k), 0, 1));
    }
    // What lies on top of what is left: the outermost envelope not yet half out, or the card.
    const top = p === null ? N : N - Math.floor(p + 0.5);
    envs.forEach((e) => e.body.sil.classList.toggle("hi", p !== null && e.k === top));
    envs[N - 1].stamp.classList.toggle("hi", p === null);
    card.sil.classList.toggle("hi", p !== null && top < 1);
    read.textContent = p === null ? "rest" : top < 1 ? "original" : `repost ${top}`;
    B.wake();
  }

  envs.forEach(draw);
  retarget();
  bag.add(pointer(stage, {
    move: (q) => { p = clamp((q[0] - 110) / 180, 0, 1) * (N + 0.4); retarget(); },
    leave: () => { p = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gap = v; retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "envelopes",
  means: "A photo wrapped in four reposts: the pointer peels them back one by one until the original lies bare.",
  rules: [1, 3, 5, 10],
  range: [8, 14, 20],
  tour: [[150, 160], [220, 160], [310, 160], null],
  mount,
});
