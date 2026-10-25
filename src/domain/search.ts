/**
 * Small, dependency-free BM25 search used for the menu, FAQ and knowledge base.
 * Tuned for spoken/transcribed queries: light stemming, transliteration variants
 * of Arabic dish names and a few domain synonyms.
 */

const STOPWORDS = new Set(
  "a an and are as at be but by can could do does for from have how i if in is it its me my of on or our please so tell that the their them there this to us was we what when where which who why will with would you your".split(" "),
);

/** Spelling variants → canonical token (applied after lower-casing). */
const VARIANTS: Record<string, string> = {
  majboos: "machboos",
  machbous: "machboos",
  makbous: "machboos",
  machbus: "machboos",
  kabsa: "machboos",
  lugaimat: "luqaimat",
  luqeimat: "luqaimat",
  lokma: "luqaimat",
  harris: "harees",
  hareis: "harees",
  haris: "harees",
  tharid: "thareed",
  threed: "thareed",
  salona: "saloona",
  saloon: "saloona",
  qahwa: "gahwa",
  kahwa: "gahwa",
  rgag: "regag",
  raqaq: "regag",
  jabab: "chebab",
  hamour: "hammour",
  grouper: "hammour",
  shrimp: "prawn",
  rubyan: "prawn",
  veggie: "vegetarian",
  booking: "reservation",
  reserve: "reservation",
  book: "reservation",
  takeaway: "pickup",
  collect: "pickup",
  collection: "pickup",
  carpark: "parking",
  park: "parking",
  hours: "open",
  timing: "open",
  timings: "open",
  nut: "nuts",
  peanut: "peanuts",
  dairy: "milk",
  lactose: "milk",
  wheat: "gluten",
  vegan: "vegan",
  halal: "halal",
  loomi: "loomi",
  noomi: "loomi",
  sesame: "sesame",
  tahina: "tahini",
  catering: "catering",
  bulk: "catering",
};

/** Multi-word phrases rewritten before tokenising. */
const PHRASES: [RegExp, string][] = [
  [/dried (lemon|lime)s?/g, "loomi"],
  [/black limes?/g, "loomi"],
  [/national day/g, "nationalday etihad"],
  [/eid al etihad/g, "nationalday etihad"],
  [/sauce (no\.?|number) ?(7|seven)/g, "sauceno7"],
  [/house sauces?/g, "housesauce"],
  [/cross[- ]contaminat\w*/g, "crosscontact"],
  [/cross[- ]contact/g, "crosscontact"],
  [/wheel ?chair/g, "wheelchair"],
  [/high ?chairs?/g, "highchair"],
  [/public transport/g, "metro bus abra"],
];

function stem(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith("ies")) return token.slice(0, -3) + "y";
  if (token.endsWith("sses")) return token.slice(0, -2);
  if (token.endsWith("es") && /(ches|shes|xes|oes)$/.test(token)) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss") && !token.endsWith("us")) return token.slice(0, -1);
  if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3);
  return token;
}

export function tokenize(text: string): string[] {
  let t = text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  for (const [re, rep] of PHRASES) t = t.replace(re, rep);
  return t
    .replace(/['’`]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => VARIANTS[w] ?? w)
    .map(stem);
}

export interface SearchDoc<T> {
  id: string;
  /** Weighted fields: title-like fields should get a higher weight. */
  fields: { text: string; weight: number }[];
  payload: T;
}

export interface SearchHit<T> {
  id: string;
  score: number;
  matchedTerms: string[];
  payload: T;
}

export class SearchIndex<T> {
  private docs: { id: string; tf: Map<string, number>; length: number; payload: T }[] = [];
  private df = new Map<string, number>();
  private avgLength = 0;

  constructor(docs: SearchDoc<T>[]) {
    for (const d of docs) {
      const tf = new Map<string, number>();
      let length = 0;
      for (const f of d.fields) {
        for (const tok of tokenize(f.text)) {
          tf.set(tok, (tf.get(tok) ?? 0) + f.weight);
          length += 1;
        }
      }
      this.docs.push({ id: d.id, tf, length, payload: d.payload });
      for (const tok of tf.keys()) this.df.set(tok, (this.df.get(tok) ?? 0) + 1);
    }
    this.avgLength = this.docs.reduce((s, d) => s + d.length, 0) / Math.max(1, this.docs.length);
  }

  search(query: string, limit = 10, minScore = 0.01): SearchHit<T>[] {
    const terms = [...new Set(tokenize(query))];
    if (terms.length === 0) return [];
    const N = this.docs.length;
    const k1 = 1.4;
    const b = 0.6;
    const hits: SearchHit<T>[] = [];
    for (const d of this.docs) {
      let score = 0;
      const matched: string[] = [];
      for (const term of terms) {
        const f = d.tf.get(term);
        if (!f) continue;
        matched.push(term);
        const df = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += (idf * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * d.length) / this.avgLength));
      }
      if (matched.length === 0) continue;
      // reward documents that match more of the query terms
      score *= 0.5 + matched.length / terms.length;
      if (score >= minScore) hits.push({ id: d.id, score: Math.round(score * 1000) / 1000, matchedTerms: matched, payload: d.payload });
    }
    return hits.sort((a, b2) => b2.score - a.score).slice(0, limit);
  }
}
