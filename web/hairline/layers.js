/**
 * Layers: a photo floating over its footprint, taken apart into the three layers a
 * media check reads: the capture at the back, the edit in the middle (a
 * patched region), the re-encode in front (its block grid). The pointer's x
 * pulls the layers apart on one spring, dashed guides dropping to where each stands; the layer nearest the
 * pointer takes the bright edge. At rest they stand slightly apart and the
 * patch is bright. The slider is how far apart they can be pulled.
 *
 * The pattern: scrub and pick. A spring for the gap, a pick read from the
 * gap's target, never from the pose on screen.
 */
const {
  Cam, circ, clamp, fit, lerp, mk, open, poly, proj, rrect, seg,
  spring, stepS, disposer, pointer, register,
} = HL;

const W = 72, H = 50, TK = 2.4, Z0 = 7, REST = 16, GMIN = 5, GTOP = 44;
const NAMES = ["capture", "edit", "encode"];
const FACE = rrect(0, 0, W, H, 4, 5);
const PATCH = rrect(42, 25, 64, 44, 3, 4);
const SUN = circ(5, 18).map((q) => ({ u: 54 + q.u, v: 37 + q.v }));
const HORIZON = [];
for (let u = 4; u <= W - 4; u += 2) HORIZON.push({ u, v: 17 + 5 * Math.sin(u / 10) + 2.5 * Math.sin(u / 4) });

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let gmax = value, over = null, act = -1;

  // Fitted to the layers pulled apart as far as the slider allows.
  const C = Cam(45, 0.5, 2.45);
  const ye = GTOP + TK;
  fit(C, [[0, -ye, 0], [W, ye, 0], [W, -ye, 0], [0, ye, 0], [0, -ye, Z0 + H], [W, ye, Z0 + H], [0, ye, Z0 + H]], 200, 166);
  const P = proj(C);
  const sp = spring(REST);

  // Back to front: each layer's guides, its thickness, its face and what it holds.
  const g = mk("g", {}, svg);
  const layers = NAMES.map(() => {
    const guide = mk("path", { class: "nf dash" }, g);
    const back = mk("path", { class: "lo" }, g), face = mk("path", { class: "sil" }, g);
    const marks = [mk("path", { class: "nf lo" }, g), mk("path", { class: "nf lo" }, g)];
    return { guide, back, face, marks };
  });
  layers[1].marks[0].setAttribute("class", "nf");

  /** Layer i at y: a thin upright plate facing the viewer, what is printed on it, and its drops to the ground. */
  function pose(L, i, y) {
    const w = (q) => P(q.u, y, Z0 + q.v);
    L.guide.setAttribute("d", seg(P(4, y, Z0), P(4, y, 0)) + seg(P(W - 4, y, Z0), P(W - 4, y, 0)) + seg(P(0, y, 0), P(W, y, 0)));
    L.back.setAttribute("d", poly(FACE.map((q) => P(q.u, y - TK, Z0 + q.v))));
    L.face.setAttribute("d", poly(FACE.map(w)));
    if (i === 0) {
      L.marks[0].setAttribute("d", open(HORIZON.map(w)));
      L.marks[1].setAttribute("d", poly(SUN.map(w)));
    } else if (i === 1) {
      L.marks[0].setAttribute("d", poly(PATCH.map(w)));
    } else {
      let d = "";
      for (let u = 12; u < W; u += 12) d += seg(w({ u, v: 3 }), w({ u, v: H - 3 }));
      for (let v = 12.5; v < H; v += 12.5) d += seg(w({ u: 3, v }), w({ u: W - 3, v }));
      L.marks[0].setAttribute("d", d);
    }
  }

  let drawn = NaN;
  function draw() {
    if (sp.x === drawn) return;
    drawn = sp.x;
    layers.forEach((L, i) => pose(L, i, (i - 1) * sp.x));
  }

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    draw();
    return m;
  });
  bag.add(B.unregister);

  /** The gap follows the pointer's x; the layer picked is the one nearest the pointer in the gap's target pose. */
  function retarget() {
    if (over) {
      sp.t = lerp(GMIN, gmax, clamp((over[0] - 90) / 220, 0, 1));
      let best = 0, bd = Infinity;
      for (let i = 0; i < 3; i++) {
        const c = P(W / 2, (i - 1) * sp.t, Z0 + H / 2), d = Math.hypot(c[0] - over[0], c[1] - over[1]);
        if (d < bd) { bd = d; best = i; }
      }
      act = best;
    } else { sp.t = REST; act = -1; }
    layers.forEach((L, i) => L.face.classList.toggle("hi", i === act));
    layers[1].marks[0].classList.toggle("hi", act < 0);
    read.textContent = act < 0 ? "rest" : NAMES[act];
    B.wake();
  }

  draw();
  retarget();
  bag.add(pointer(stage, {
    move: (p) => { over = p; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { gmax = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "layers",
  means: "A photo taken apart into its capture, edit and re-encode layers: the pointer pulls them apart and picks one.",
  rules: [1, 3, 5, 8],
  range: [24, 34, 44],
  tour: [[120, 190], [220, 150], [300, 120], null],
  mount,
});
