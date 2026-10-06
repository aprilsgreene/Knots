import type { Entry } from "@shared/schema";

// Surfaces words that come up often across a relationship's own entries --
// pulled from every free-text field the user wrote (title, what happened,
// feelings, body notice, need/hope, what followed, remember), never from
// tags or ratings. Framed as "words that come up often in what I've
// written", not as a theme, trait, or claim about the other person.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "so", "of", "to", "in",
  "on", "at", "for", "with", "about", "as", "by", "from", "up", "out", "into",
  "over", "after", "before", "again", "further", "once", "is", "am", "are",
  "was", "were", "be", "been", "being", "have", "has", "had", "having", "do",
  "does", "did", "doing", "would", "should", "could", "ought", "i", "im",
  "ive", "id", "youre", "youve", "you", "your", "yours", "he", "him", "his",
  "she", "her", "hers", "it", "its", "they", "them", "their", "theirs", "we",
  "us", "our", "ours", "me", "my", "mine", "this", "that", "these", "those",
  "there", "here", "what", "which", "who", "whom", "when", "where", "why",
  "how", "all", "any", "both", "each", "few", "more", "most", "other",
  "some", "such", "no", "nor", "not", "only", "own", "same", "than", "too",
  "very", "just", "can", "will", "dont", "didnt", "doesnt", "isnt", "wasnt",
  "werent", "cant", "couldnt", "wouldnt", "shouldnt", "wont", "get", "got",
  "one", "like", "really", "still", "also", "even", "back", "felt", "feel",
  "feeling", "feelings", "thing", "things", "went", "going", "go", "said",
  "say", "know", "think", "thought",
]);

export interface WordCount {
  word: string;
  count: number;
}

function textFieldsOf(entry: Entry): string[] {
  return [
    entry.title,
    entry.whatHappened,
    entry.feelings,
    entry.bodyNotice,
    entry.needHope,
    entry.whatFollowed,
    entry.remember,
  ].filter((v): v is string => Boolean(v && v.trim()));
}

export function topWords(entries: Entry[], limit = 10, minCount = 2): WordCount[] {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    for (const field of textFieldsOf(entry)) {
      const words = field
        .toLowerCase()
        .replace(/[^a-z'\s]/g, " ")
        .split(/\s+/)
        .map((w) => w.replace(/^'+|'+$/g, ""))
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
      for (const w of words) {
        counts[w] = (counts[w] || 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .filter(([, count]) => count >= minCount)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}
