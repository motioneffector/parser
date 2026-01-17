class R extends Error {
  constructor(o) {
    super(o), this.name = "ParserError", Object.setPrototypeOf(this, new.target.prototype);
  }
}
class L extends R {
  constructor(o, t) {
    super(o), this.field = t, this.name = "ValidationError";
  }
}
class D extends R {
  constructor(o, t, b) {
    super(o), this.position = t, this.input = b, this.name = "ParseError";
  }
}
function H(e) {
  const o = [];
  let t = 0;
  for (; t < e.length; ) {
    const b = e[t];
    if (b && /\s/.test(b)) {
      t++;
      continue;
    }
    if (b === '"' || b === "'") {
      const m = b, g = t;
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
      T || (d = e.slice(g + 1), t = e.length), o.push({
        type: "QUOTED_STRING",
        value: d,
        original: e.slice(g, t),
        start: g,
        end: t
      });
      continue;
    }
    if (b && /[a-zA-Z0-9_\u0080-\uFFFF]/.test(b)) {
      const m = t;
      let g = "";
      for (; t < e.length; ) {
        const p = e[t];
        if (p && /[a-zA-Z0-9_\u0080-\uFFFF]/.test(p))
          g += p, t++;
        else
          break;
      }
      let d = g;
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
      const T = e.slice(m, m + g.length);
      o.push({
        type: "WORD",
        value: d.toLowerCase(),
        original: T,
        start: m,
        end: m + g.length
      });
      continue;
    }
    t++;
  }
  return o;
}
function P(e) {
  Object.freeze(e);
  for (const o of Object.values(e))
    o !== null && typeof o == "object" && !Object.isFrozen(o) && P(o);
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
function W(e) {
  if (typeof e.resolver != "function")
    throw new L("Resolver must be a function", "resolver");
  const o = V(e.vocabulary), t = e.partialMatch ?? !0, b = e.minPartialLength ?? 3;
  let m = null, g = null;
  function d(s) {
    for (const i of o.verbs)
      if (i.synonyms.includes(s))
        return i;
    if (t && s.length >= b) {
      for (const i of o.verbs)
        for (const x of i.synonyms)
          if (x.startsWith(s))
            return i;
    }
    return null;
  }
  function T(s) {
    for (const i of o.directions)
      if (i.aliases.includes(s))
        return i.canonical;
    return null;
  }
  function p(s) {
    return o.articles.includes(s);
  }
  function _(s) {
    return o.prepositions.includes(s);
  }
  function S(s, i, x) {
    let l = i;
    const n = [];
    let E = null;
    for (; l < s.length; ) {
      const r = s[l];
      if (r && p(r.value))
        l++;
      else
        break;
    }
    const w = s[l];
    if ((w == null ? void 0 : w.value) === "it")
      return m ? { entity: m, consumed: l - i + 1 } : {
        entity: null,
        consumed: l - i + 1,
        error: {
          type: "parse_error",
          message: 'Cannot use "it" without a previous referent',
          position: w.start
        }
      };
    const u = [];
    for (; l < s.length; ) {
      const r = s[l];
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
      const r = s[i];
      return {
        entity: null,
        consumed: l - i,
        error: {
          type: "unknown_noun",
          noun: E,
          position: r ? r.start : 0
        }
      };
    }
    if (!Array.isArray(c)) {
      const r = s[i];
      return {
        entity: null,
        consumed: l - i,
        error: {
          type: "unknown_noun",
          noun: E,
          position: r ? r.start : 0
        }
      };
    }
    if (c.length === 0) {
      const r = s[i];
      return {
        entity: null,
        consumed: l - i,
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
        consumed: l - i,
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
    }, consumed: l - i } : { entity: null, consumed: 0 };
  }
  function $(s, i) {
    const x = s, l = i == null ? void 0 : i.scope;
    if (s.length > O)
      throw new L(
        `Input exceeds maximum length of ${O} characters`,
        "input"
      );
    l && l.room !== g && (m = null, g = l.room);
    const n = H(s);
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
        const a = n[n.length - 1];
        return {
          type: "parse_error",
          message: `Expected object after "${u.canonical}"`,
          position: a ? a.end : 0
        };
      }
      const { entity: c, consumed: j, error: h } = S(n, 1, l);
      if (h)
        return h;
      if (!c) {
        const a = n[1];
        return {
          type: "parse_error",
          message: `Expected object after "${u.canonical}"`,
          position: a ? a.start : 0
        };
      }
      f.subject = c;
      const r = 1 + j;
      if (r < n.length) {
        const a = n[r];
        if (a && _(a.value)) {
          if (f.preposition = a.value, r + 1 >= n.length)
            return {
              type: "parse_error",
              message: `Expected target after "${a.value}"`,
              position: a.end
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
              message: `Expected target after "${a.value}"`,
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
      const a = n[r];
      if (!a || !_(a.value)) {
        const y = n[n.length - 1];
        return {
          type: "parse_error",
          message: `Expected preposition, got "${(a == null ? void 0 : a.value) ?? "nothing"}"`,
          position: (a == null ? void 0 : a.start) ?? (y ? y.end : 0)
        };
      }
      if (f.preposition = a.value, r + 1 >= n.length)
        return {
          type: "parse_error",
          message: `Expected target after "${a.value}"`,
          position: a.end
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
          message: `Expected target after "${a.value}"`,
          position: y ? y.start : 0
        };
      }
      return f.object = A, m = c, { type: "command", command: f };
    }
  }
  function C(s) {
    o.verbs.push(s);
  }
  function N(s) {
    o.directions.push(s);
  }
  function U() {
    m = null;
  }
  function F() {
    return {
      verbs: [...o.verbs],
      directions: [...o.directions],
      prepositions: [...o.prepositions],
      articles: [...o.articles]
    };
  }
  return {
    parse: $,
    addVerb: C,
    addDirection: N,
    clearPronoun: U,
    getVocabulary: F
  };
}
function V(e) {
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
  D as ParseError,
  R as ParserError,
  L as ValidationError,
  W as createParser
};
