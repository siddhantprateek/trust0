/**
 * Checkpoint: claims ride a belt through a gate. The ones that fail the check
 * are pushed off sideways onto a reject lane as they clear the gate; the rest
 * ride on. Both lanes run into a hood at the near end and the claims come back
 * out of the hood at the far end. The belt never stops; hovering slows it so
 * one claim can be read, and the claim under the pointer takes the bright
 * edge. Otherwise the flagged claim nearest the gate has it. Each claim's
 * number is a dot code on its lid. The slider is how slow hovering makes it.
 *
 * The pattern: dilate time. An ambient loop, one spring on the rate, and paint
 * order kept by moving groups, never by redrawing.
 */
const {
  Cam, clamp, facing, fit, flatDot, lerp, mk, place, prism, proj, rings, seg, spring, stepS,
  unproj, disposer, pointer, put, register, solid,
} = HL;

const BW = 12, BH = 6, LY0 = 20, LY1 = 40, LH = 2, HH = 13;
const N = 7, SP = 20, L = N * SP, CS = 5.5, CH = 8, XS = -68, SPEED = 12;
const FLAG = [0, 1, 0, 0, 1, 0, 1];
const ease = (t) => t * t * (3 - 2 * t);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let slow = value, phase = 0, over = null, pick = -1;

  const C = Cam(45, 0.5, 2.2);
  fit(C, [[-74, -BW - 6, 0], [76, LY1 + 3, 0], [76, -BW - 6, 0], [-74, LY1 + 3, 0], [-74, -BW - 6, 28], [76, LY1 + 3, HH]], 200, 166);
  const P = proj(C), front = facing(C);
  const rate = spring(1);
  const block = (x0, y0, x1, y1, r, b, z0, z1, parent) => {
    const el = solid(parent);
    const [ring, inner] = rings(x0, y0, x1, y1, r, b);
    put(el, prism(P, front, ring, inner, z0, z1));
    return el;
  };

  // Fixed, back to front: the belt and its slats, the reject lane, the gate's scan beam.
  const g = mk("g", {}, svg);
  block(-72, -BW, 74, BW, 5, 1.6, 0, BH, g);
  const slats = mk("path", { class: "nf lo" }, g);
  block(4, LY0, 74, LY1, 5, 1.6, 0, LH, g);
  mk("path", { d: seg(P(0, -BW - 4, 15), P(0, BW + 4, 15)), class: "nf dash" }, g);

  // These move in the paint order every frame, so each is its own group.
  const startHood = block(-74, -BW - 3, -50, BW + 3, 5, 1.6, 0, HH, g).g;
  const farPost = block(-2, -BW - 6, 2, -BW - 2, 1.4, 0.6, 0, 26, g).g;
  const nearPost = block(-2, BW + 2, 2, BW + 6, 1.4, 0.6, 0, 26, g).g;
  const claims = FLAG.map((f, i) => {
    const grp = mk("g", {}, g), body = solid(grp);
    const dots = [0, 1, 2, 3].map((b) => flatDot(grp, C, 0.6, ((i + 1) >> b) & 1 ? "dot m" : "dot off"));
    return { i, f, grp, body, dots, x: 0, y: 0, z: BH };
  });
  const lintel = block(-2.5, -BW - 6, 2.5, BW + 6, 1.6, 0.7, 24, 28, g).g;
  const endHood = block(54, -BW - 3, 76, LY1 + 3, 5, 1.6, 0, HH, g).g;

  /** Where claim c is: along the path, then, for a flagged one past the gate, across onto the lane. */
  function locate(c) {
    c.x = XS + ((phase + c.i * SP) % L);
    const d = c.f ? ease(clamp((c.x - 6) / 16, 0, 1)) : 0;
    c.y = lerp(0, (LY0 + LY1) / 2, d);
    c.z = lerp(BH, LH, d);
  }

  function draw() {
    let d = "";
    for (let k = 0; k < 14; k++) {
      const x = -72 + ((k * 10 + phase) % 146);
      d += seg(P(x, -BW + 1.6, BH), P(x, BW - 1.6, BH));
    }
    slats.setAttribute("d", d);
    for (const c of claims) {
      const [r, b] = rings(c.x - CS, c.y - CS, c.x + CS, c.y + CS, 2, 0.8);
      put(c.body, prism(P, front, r, b, c.z, c.z + CH));
      c.dots.forEach((el, k) => place(el, P(c.x + (k % 2 ? 1.8 : -1.8), c.y + (k < 2 ? -1.8 : 1.8), c.z + CH)));
    }
    // Claims still inside the far hood go behind it; the rest sort by depth with the two posts.
    const inHood = claims.filter((c) => c.x < -49).map((c) => [c.x + c.y, c.grp]);
    const rest = claims.filter((c) => c.x >= -49).map((c) => [c.x + c.y, c.grp]);
    rest.push([-BW - 4, farPost], [BW + 4, nearPost]);
    const order = [...inHood.sort((a, b) => a[0] - b[0]), [0, startHood], ...rest.sort((a, b) => a[0] - b[0]), [0, lintel], [0, endHood]];
    for (const [, el] of order) g.appendChild(el);
  }

  /** The bright edge: the claim under the pointer, or else the flagged claim nearest the gate. */
  function light() {
    let lit = pick;
    if (lit < 0) {
      let bd = Infinity;
      for (const c of claims) if (c.f && c.x > -12 && c.x < 48 && Math.abs(c.x - 10) < bd) { bd = Math.abs(c.x - 10); lit = c.i; }
    }
    claims.forEach((c) => c.body.sil.classList.toggle("hi", c.i === lit));
    const c = claims[pick];
    read.textContent = pick < 0 ? "rest" : `claim ${c.i + 1} · ${c.f && c.x > 6 ? "flagged" : c.f ? "checking" : c.x > 6 ? "ok" : "checking"}`;
  }

  /** The claim nearest the pointer's spot on the belt's top plane, within reach. */
  function hit() {
    if (!over) return -1;
    let b = -1, bd = 12;
    for (const c of claims) {
      if (c.x < -49 || c.x > 50) continue;
      const d = Math.hypot(c.x - over[0], c.y - over[1]);
      if (d < bd) { bd = d; b = c.i; }
    }
    return b;
  }

  const B = register(stage, (dt) => {
    stepS(rate, dt);
    phase = (phase + SPEED * rate.x * dt) % (L * 73);
    claims.forEach(locate);
    pick = hit();
    draw();
    light();
    return true;
  });
  bag.add(B.unregister);

  claims.forEach(locate);
  draw();
  light();
  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], BH + CH); rate.t = slow; B.wake(); },
    leave: () => { over = null; rate.t = 1; B.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { slow = v; if (over) rate.t = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "checkpoint",
  means: "Claims ride a belt through a gate; the unsupported ones are pushed off onto a reject lane. Hovering slows the belt.",
  rules: [4, 6, 7, 10],
  range: [0.05, 0.15, 0.35],
  tour: [[150, 120], [215, 170], [260, 210], null],
  mount,
});
