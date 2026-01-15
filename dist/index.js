class R extends Error {
  constructor(i) {
    super(i), this.name = "ParserError", Object.setPrototypeOf(this, new.target.prototype);
  }
}
class L extends R {
  constructor(i, t) {
    super(i), this.field = t, this.name = "ValidationError";
  }
}
class V extends R {
  constructor(i, t, g) {
    super(i), this.position = t, this.input = g, this.name = "ParseError";
  }
}
function F(e) {
  const i = [];
  let t = 0;
  for (; t < e.length; ) {
    const g = e[t];
    if (g && /\s/.test(g)) {
      t++;
      continue;
    }
    if (g === '"' || g === "'") {
      const m = g, b = t;
      t++;
      let d = "", T = !1;
      for (; t < e.length; ) {
        const p = e[t];
        if (!p) break;
        if (p === "\\" && t + 1 < e.length) {
          const _ = e[t + 1];
          if (_ === m || _ === "\\") {
            d += _, t += 2;
            continue;
          }
        }
        if (p === m) {
          T = !0, t++;
          break;
        }
        d += p, t++;
      }
      T || (d = e.slice(b + 1), t = e.length), i.push({
        type: "QUOTED_STRING",
        value: d,
        original: e.slice(b, t),
        start: b,
        end: t
      });
      continue;
    }
    if (g && /[a-zA-Z0-9_\u0080-\uFFFF]/.test(g)) {
      const m = t;
      let b = "";
      for (; t < e.length; ) {
        const p = e[t];
        if (p && /[a-zA-Z0-9_\u0080-\uFFFF]/.test(p))
          b += p, t++;
        else
          break;
      }
      let d = b;
      for (; d.length > 0; ) {
        const p = d[d.length - 1];
        if (p && /[.,!?;:]/.test(p))
          d = d.slice(0, -1), t--;
        else
          break;
      }
      for (; t < e.length; ) {
        const p = e[t];
        if (p && /[.,!?;:]/.test(p))
          t++;
        else
          break;
      }
      const T = e.slice(m, m + b.length);
      i.push({
        type: "WORD",
        value: d.toLowerCase(),
        original: T,
        start: m,
        end: m + b.length
      });
      continue;
    }
    t++;
  }
  return i;
}
function P(e) {
  Object.freeze(e);
  for (const i of Object.values(e))
    i !== null && typeof i == "object" && !Object.isFrozen(i) && P(i);
  return e;
}
const k = P({
  verbs: [
    // Movement
    { canonical: "GO", synonyms: ["go", "walk", "run"], pattern: "direction" },
    { canonical: "ENTER", synonyms: ["enter"], pattern: "subject" },
    { canonical: "EXIT", synonyms: ["exit", "leave"], pattern: "none" },
    { canonical: "CLIMB", synonyms: ["climb"], pattern: "subject" },
    // Interaction
    { canonical: "GET", synonyms: ["get", "take", "grab", "pick"], pattern: "subject" },
    { canonical: "DROP", synonyms: ["drop"], pattern: "subject" },
    { canonical: "PUT", synonyms: ["put"], pattern: "subject_object" },
    { canonical: "GIVE", synonyms: ["give"], pattern: "subject_object" },
    { canonical: "THROW", synonyms: ["throw"], pattern: "subject_object" },
    { canonical: "OPEN", synonyms: ["open"], pattern: "subject" },
    { canonical: "CLOSE", synonyms: ["close"], pattern: "subject" },
    { canonical: "LOCK", synonyms: ["lock"], pattern: "subject" },
    { canonical: "UNLOCK", synonyms: ["unlock"], pattern: "subject" },
    // Note: verbs can have flexible patterns - parser tries subject_object first, then subject
    // Examination
    { canonical: "LOOK", synonyms: ["look", "l"], pattern: "none" },
    { canonical: "EXAMINE", synonyms: ["examine", "x", "inspect"], pattern: "subject" },
    { canonical: "SEARCH", synonyms: ["search"], pattern: "subject" },
    { canonical: "READ", synonyms: ["read"], pattern: "subject" },
    // Communication
    { canonical: "SAY", synonyms: ["say"], pattern: "text" },
    { canonical: "SHOUT", synonyms: ["shout"], pattern: "text" },
    { canonical: "TALK", synonyms: ["talk"], pattern: "subject" },
    { canonical: "ASK", synonyms: ["ask"], pattern: "subject_object" },
    { canonical: "TELL", synonyms: ["tell"], pattern: "subject_object" },
    // Combat
    { canonical: "ATTACK", synonyms: ["attack", "hit", "strike"], pattern: "subject" },
    { canonical: "KILL", synonyms: ["kill"], pattern: "subject" },
    { canonical: "FIGHT", synonyms: ["fight"], pattern: "subject" },
    // Meta
    { canonical: "INVENTORY", synonyms: ["inventory", "i", "inv"], pattern: "none" },
    { canonical: "SCORE", synonyms: ["score"], pattern: "none" },
    { canonical: "SAVE", synonyms: ["save"], pattern: "none" },
    { canonical: "LOAD", synonyms: ["load"], pattern: "none" },
    { canonical: "QUIT", synonyms: ["quit"], pattern: "none" },
    { canonical: "HELP", synonyms: ["help"], pattern: "none" }
  ],
  directions: [
    { canonical: "NORTH", aliases: ["north", "n"] },
    { canonical: "SOUTH", aliases: ["south", "s"] },
    { canonical: "EAST", aliases: ["east", "e"] },
    { canonical: "WEST", aliases: ["west", "w"] },
    { canonical: "NORTHEAST", aliases: ["northeast", "ne"] },
    { canonical: "NORTHWEST", aliases: ["northwest", "nw"] },
    { canonical: "SOUTHEAST", aliases: ["southeast", "se"] },
    { canonical: "SOUTHWEST", aliases: ["southwest", "sw"] },
    { canonical: "UP", aliases: ["up", "u"] },
    { canonical: "DOWN", aliases: ["down", "d"] },
    { canonical: "IN", aliases: ["in"] },
    { canonical: "OUT", aliases: ["out"] }
  ],
  prepositions: ["with", "to", "at", "in", "on", "from", "into", "onto", "about"],
  articles: ["the", "a", "an"]
}), O = 1e6;
function D(e) {
  if (typeof e.resolver != "function")
    throw new L("Resolver must be a function", "resolver");
  const i = H(e.vocabulary), t = e.partialMatch ?? !0, g = e.minPartialLength ?? 3;
  let m = null, b = null;
  function d(o) {
    for (const a of i.verbs)
      if (a.synonyms.includes(o))
        return a;
    if (t && o.length >= g) {
      for (const a of i.verbs)
        for (const x of a.synonyms)
          if (x.startsWith(o))
            return a;
    }
    return null;
  }
  function T(o) {
    for (const a of i.directions)
      if (a.aliases.includes(o))
        return a.canonical;
    return null;
  }
  function p(o) {
    return i.articles.includes(o);
  }
  function _(o) {
    return i.prepositions.includes(o);
  }
  function S(o, a, x) {
    let l = a;
    const n = [];
    let E = null;
    for (; l < o.length; ) {
      const r = o[l];
      if (r && p(r.value))
        l++;
      else
        break;
    }
    const w = o[l];
    if ((w == null ? void 0 : w.value) === "it")
      return m ? { entity: m, consumed: l - a + 1 } : {
        entity: null,
        consumed: l - a + 1,
        error: {
          type: "parse_error",
          message: 'Cannot use "it" without a previous referent',
          position: w.start
        }
      };
    const u = [];
    for (; l < o.length; ) {
      const r = o[l];
      if (!r || _(r.value) || T(r.value)) break;
      p(r.value) || u.push(r.value), l++;
    }
    if (u.length === 0)
      return { entity: null, consumed: 0 };
    const f = u[u.length - 1];
    if (!f)
      return { entity: null, consumed: 0 };
    E = f, u.length > 1 && n.push(...u.slice(0, -1));
    let c;
    try {
      c = e.resolver(E, n, x ?? {});
    } catch {
      const r = o[a];
      return {
        entity: null,
        consumed: l - a,
        error: {
          type: "unknown_noun",
          noun: E,
          position: r ? r.start : 0
        }
      };
    }
    if (!Array.isArray(c)) {
      const r = o[a];
      return {
        entity: null,
        consumed: l - a,
        error: {
          type: "unknown_noun",
          noun: E,
          position: r ? r.start : 0
        }
      };
    }
    if (c.length === 0) {
      const r = o[a];
      return {
        entity: null,
        consumed: l - a,
        error: {
          type: "unknown_noun",
          noun: E,
          position: r ? r.start : 0
        }
      };
    }
    if (c.length > 1)
      return {
        entity: null,
        consumed: l - a,
        error: {
          type: "ambiguous",
          candidates: c,
          original: u.join(" "),
          role: "subject"
        }
      };
    const j = c[0];
    return j ? { entity: {
      id: j.id,
      noun: E,
      adjectives: n
    }, consumed: l - a } : { entity: null, consumed: 0 };
  }
  function $(o, a) {
    const x = o, l = a == null ? void 0 : a.scope;
    if (o.length > O)
      throw new L(
        `Input exceeds maximum length of ${O} characters`,
        "input"
      );
    l && l.room !== b && (m = null, b = l.room);
    const n = F(o);
    if (n.length === 0)
      return {
        type: "parse_error",
        message: "Empty input",
        position: 0
      };
    const E = n[0];
    if (!E)
      return {
        type: "parse_error",
        message: "Empty input",
        position: 0
      };
    const w = T(E.value);
    if (w)
      return { type: "command", command: {
        verb: "GO",
        direction: w,
        raw: x
      } };
    const u = d(E.value);
    if (!u)
      return {
        type: "unknown_verb",
        verb: E.value
      };
    const f = {
      verb: u.canonical,
      raw: x
    };
    if (u.pattern === "none")
      return { type: "command", command: f };
    if (u.pattern === "direction") {
      if (n.length < 2) {
        const h = n[n.length - 1];
        return {
          type: "parse_error",
          message: `Expected direction after "${u.canonical}"`,
          position: h ? h.end : 0
        };
      }
      const c = n[1];
      if (!c)
        return {
          type: "parse_error",
          message: `Expected direction after "${u.canonical}"`,
          position: 0
        };
      const j = T(c.value);
      return j ? (f.direction = j, { type: "command", command: f }) : {
        type: "parse_error",
        message: `Expected direction, got "${c.value}"`,
        position: c.start
      };
    }
    if (u.pattern === "text") {
      if (n.length < 2) {
        const h = n[n.length - 1];
        return {
          type: "parse_error",
          message: `Expected text after "${u.canonical}"`,
          position: h ? h.end : 0
        };
      }
      const c = n[1];
      if (!c)
        return {
          type: "parse_error",
          message: `Expected text after "${u.canonical}"`,
          position: 0
        };
      const j = c.start;
      return f.text = x.slice(j).trim(), { type: "command", command: f };
    }
    if (u.pattern === "subject") {
      if (n.length < 2) {
        const s = n[n.length - 1];
        return {
          type: "parse_error",
          message: `Expected object after "${u.canonical}"`,
          position: s ? s.end : 0
        };
      }
      const { entity: c, consumed: j, error: h } = S(n, 1, l);
      if (h)
        return h;
      if (!c) {
        const s = n[1];
        return {
          type: "parse_error",
          message: `Expected object after "${u.canonical}"`,
          position: s ? s.start : 0
        };
      }
      f.subject = c;
      const r = 1 + j;
      if (r < n.length) {
        const s = n[r];
        if (s && _(s.value)) {
          if (f.preposition = s.value, r + 1 >= n.length)
            return {
              type: "parse_error",
              message: `Expected target after "${s.value}"`,
              position: s.end
            };
          const {
            entity: A,
            error: v
          } = S(n, r + 1, l);
          if (v)
            return v.type === "ambiguous" ? { ...v, role: "object" } : v;
          if (!A) {
            const y = n[r + 1];
            return {
              type: "parse_error",
              message: `Expected target after "${s.value}"`,
              position: y ? y.start : 0
            };
          }
          f.object = A;
        }
      }
      return m = c, { type: "command", command: f };
    }
    {
      if (n.length < 2) {
        const y = n[n.length - 1];
        return {
          type: "parse_error",
          message: `Expected object after "${u.canonical}"`,
          position: y ? y.end : 0
        };
      }
      const { entity: c, consumed: j, error: h } = S(
        n,
        1,
        l
      );
      if (h)
        return h;
      if (!c) {
        const y = n[1];
        return {
          type: "parse_error",
          message: `Expected object after "${u.canonical}"`,
          position: y ? y.start : 0
        };
      }
      f.subject = c;
      const r = 1 + j;
      if (r >= n.length) {
        const y = n[n.length - 1];
        return {
          type: "parse_error",
          message: "Expected preposition and target",
          position: y ? y.end : 0
        };
      }
      const s = n[r];
      if (!s || !_(s.value)) {
        const y = n[n.length - 1];
        return {
          type: "parse_error",
          message: `Expected preposition, got "${(s == null ? void 0 : s.value) ?? "nothing"}"`,
          position: (s == null ? void 0 : s.start) ?? (y ? y.end : 0)
        };
      }
      if (f.preposition = s.value, r + 1 >= n.length)
        return {
          type: "parse_error",
          message: `Expected target after "${s.value}"`,
          position: s.end
        };
      const {
        entity: A,
        error: v
      } = S(n, r + 1, l);
      if (v)
        return v.type === "ambiguous" ? { ...v, role: "object" } : v;
      if (!A) {
        const y = n[r + 1];
        return {
          type: "parse_error",
          message: `Expected target after "${s.value}"`,
          position: y ? y.start : 0
        };
      }
      return f.object = A, m = c, { type: "command", command: f };
    }
  }
  function C(o) {
    i.verbs.push(o);
  }
  function N(o) {
    i.directions.push(o);
  }
  function U() {
    m = null;
  }
  return {
    parse: $,
    addVerb: C,
    addDirection: N,
    clearPronoun: U
  };
}
function H(e) {
  return e ? e.extend ?? !0 ? {
    verbs: [...k.verbs, ...e.verbs ?? []],
    directions: [...k.directions, ...e.directions ?? []],
    prepositions: [...k.prepositions, ...e.prepositions ?? []],
    articles: [...k.articles, ...e.articles ?? []]
  } : {
    verbs: [...e.verbs ?? []],
    directions: [...e.directions ?? []],
    prepositions: [...e.prepositions ?? []],
    articles: [...e.articles ?? []]
  } : {
    verbs: [...k.verbs],
    directions: [...k.directions],
    prepositions: [...k.prepositions],
    articles: [...k.articles]
  };
}
export {
  V as ParseError,
  R as ParserError,
  L as ValidationError,
  D as createParser
};
