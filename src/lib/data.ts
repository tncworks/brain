/**
 * DSA Brain — data source of truth.
 *
 * Append a topic or a problem here and the graph, stats, search, and redo
 * queue pick it up automatically. Dates are ISO `YYYY-MM-DD`.
 */

export type TopicStatus = "done" | "in-progress" | "next" | "locked";
export type Difficulty = "easy" | "medium" | "hard";

/**
 * redoStatus
 *  - "redone"     solved, and re-solved at least once (redoDate = most recent redo)
 *  - "tracked"    solved, on the redo ladder, no redo logged yet (redoDate = null)
 *  - "untracked"  solved before redo tracking began; never nags unless you mark it redone
 *  - "pending"    queued, not solved yet
 */
export type RedoStatus = "redone" | "tracked" | "untracked" | "pending";

export type TopicId =
  | "arrays"
  | "strings"
  | "monotonic-stack"
  | "sliding-window"
  | "two-pointers"
  | "prefix-sums"
  | "hashing"
  | "stacks-queues"
  | "linked-lists"
  | "binary-search"
  | "bst"
  | "heaps"
  | "bfs-dfs"
  | "topo"
  | "dijkstra"
  | "recursion"
  | "backtracking"
  | "dp";

export interface Topic {
  id: TopicId;
  name: string;
  /** Short label for the graph node. */
  short: string;
  status: TopicStatus;
  /** Loose region of the brain the topic lives in — only used to seed layout. */
  lobe: "foundations" | "linear" | "search" | "graphs" | "recursion";
  blurb: string;
}

export interface Problem {
  /** Stable id, used as the localStorage key for redos. */
  id: string;
  lc: number | null;
  title: string;
  /** LeetCode URL slug, when it exists. */
  slug?: string;
  difficulty: Difficulty;
  /** First topic is the primary one (drives colour / grouping); others add extra edges. */
  topics: TopicId[];
  /** null = solved before dates were logged. */
  solvedDate: string | null;
  /** Most recent redo, or null. */
  redoDate: string | null;
  redoStatus: RedoStatus;
  note?: string;
}

/**
 * Spaced-repetition ladder: days to wait before the 1st, 2nd, 3rd… redo.
 * After the last rung it keeps repeating the last interval.
 */
export const REDO_LADDER = [3, 7, 14, 30];

export const CURRENT_TOPIC: TopicId = "recursion";

export const topics: Topic[] = [
  { id: "arrays", name: "Arrays", short: "Arrays", status: "done", lobe: "foundations", blurb: "Contiguous memory, indices, in-place tricks. Everything else grows from here." },
  { id: "strings", name: "Strings", short: "Strings", status: "done", lobe: "foundations", blurb: "Character arrays with extra rules — frequency maps, anagrams, palindromes." },
  { id: "hashing", name: "Hashing", short: "Hashing", status: "done", lobe: "foundations", blurb: "O(1) lookups. Turns nested loops into single passes." },
  { id: "prefix-sums", name: "Prefix Sums", short: "Prefix Sums", status: "done", lobe: "foundations", blurb: "Precompute running totals so range queries become subtraction." },
  { id: "two-pointers", name: "Two Pointers", short: "Two Pointers", status: "done", lobe: "foundations", blurb: "Walk two indices toward each other to shrink the search space." },
  { id: "sliding-window", name: "Sliding Window", short: "Sliding Window", status: "done", lobe: "foundations", blurb: "Grow and shrink a window over a sequence while maintaining an invariant." },
  { id: "stacks-queues", name: "Stacks & Queues", short: "Stacks / Queues", status: "done", lobe: "linear", blurb: "LIFO and FIFO. The scaffolding under DFS, BFS, and expression parsing." },
  { id: "monotonic-stack", name: "Monotonic Stack", short: "Mono Stack", status: "done", lobe: "linear", blurb: "A stack that only ever increases or decreases — next-greater-element in O(n)." },
  { id: "linked-lists", name: "Linked Lists", short: "Linked Lists", status: "done", lobe: "linear", blurb: "Pointer surgery: reversal, cycle detection, fast & slow runners." },
  { id: "binary-search", name: "Binary Search", short: "Binary Search", status: "done", lobe: "search", blurb: "Halve the answer space on every step. Works on any monotonic predicate." },
  { id: "bst", name: "Binary Search Trees", short: "BST", status: "done", lobe: "search", blurb: "Ordered trees — in-order traversal yields sorted output." },
  { id: "heaps", name: "Heaps", short: "Heaps", status: "done", lobe: "search", blurb: "Priority queues. Top-k, merging streams, and the engine inside Dijkstra." },
  { id: "bfs-dfs", name: "Graphs · BFS / DFS", short: "BFS / DFS", status: "done", lobe: "graphs", blurb: "Traversal primitives. Grids, components, bipartite checks, shortest unweighted paths." },
  { id: "topo", name: "Topological Sort (Kahn's)", short: "Topo Sort", status: "done", lobe: "graphs", blurb: "Order a DAG by peeling off zero in-degree nodes. Detects cycles for free." },
  { id: "dijkstra", name: "Dijkstra", short: "Dijkstra", status: "done", lobe: "graphs", blurb: "Weighted shortest paths with a min-heap frontier." },
  { id: "recursion", name: "Recursion", short: "Recursion", status: "next", lobe: "recursion", blurb: "Define the problem in terms of a smaller version of itself. Trust the call." },
  { id: "backtracking", name: "Backtracking", short: "Backtracking", status: "locked", lobe: "recursion", blurb: "Recursion with undo. Explore, commit, retreat — subsets, permutations, N-Queens." },
  { id: "dp", name: "Dynamic Programming", short: "DP", status: "locked", lobe: "recursion", blurb: "Recursion with memory. Overlapping subproblems, optimal substructure." },
];

/** Directed prerequisite edges: [from, to] means `from` unlocks `to`. */
export const prerequisites: [TopicId, TopicId][] = [
  ["recursion", "backtracking"],
  ["backtracking", "dp"],
  ["arrays", "sliding-window"],
  ["arrays", "two-pointers"],
  ["arrays", "prefix-sums"],
  ["stacks-queues", "monotonic-stack"],
  ["bfs-dfs", "topo"],
  ["bfs-dfs", "dijkstra"],
];

export const problems: Problem[] = [
  // ── Sliding window — Aug 23, redone Aug 26 ──────────────────────────
  { id: "lc-209", lc: 209, title: "Minimum Size Subarray Sum", slug: "minimum-size-subarray-sum", difficulty: "medium", topics: ["sliding-window"], solvedDate: "2026-08-23", redoDate: "2026-08-26", redoStatus: "redone" },
  { id: "lc-3", lc: 3, title: "Longest Substring Without Repeating Characters", slug: "longest-substring-without-repeating-characters", difficulty: "medium", topics: ["sliding-window", "hashing"], solvedDate: "2026-08-23", redoDate: "2026-08-26", redoStatus: "redone" },
  { id: "lc-76", lc: 76, title: "Minimum Window Substring", slug: "minimum-window-substring", difficulty: "hard", topics: ["sliding-window", "hashing"], solvedDate: "2026-08-23", redoDate: "2026-08-26", redoStatus: "redone" },
  { id: "lc-424", lc: 424, title: "Longest Repeating Character Replacement", slug: "longest-repeating-character-replacement", difficulty: "medium", topics: ["sliding-window"], solvedDate: "2026-08-23", redoDate: "2026-08-26", redoStatus: "redone" },
  { id: "lc-567", lc: 567, title: "Permutation in String", slug: "permutation-in-string", difficulty: "medium", topics: ["sliding-window"], solvedDate: "2026-08-23", redoDate: "2026-08-26", redoStatus: "redone" },

  // ── Arrays / prefix / two pointers — Aug 28, redone Aug 31 ──────────
  { id: "lc-121", lc: 121, title: "Best Time to Buy and Sell Stock", slug: "best-time-to-buy-and-sell-stock", difficulty: "easy", topics: ["arrays"], solvedDate: "2026-08-28", redoDate: "2026-08-31", redoStatus: "redone" },
  { id: "lc-238", lc: 238, title: "Product of Array Except Self", slug: "product-of-array-except-self", difficulty: "medium", topics: ["prefix-sums"], solvedDate: "2026-08-28", redoDate: "2026-08-31", redoStatus: "redone" },
  { id: "lc-560", lc: 560, title: "Subarray Sum Equals K", slug: "subarray-sum-equals-k", difficulty: "medium", topics: ["prefix-sums", "hashing"], solvedDate: "2026-08-28", redoDate: "2026-08-31", redoStatus: "redone" },
  { id: "lc-11", lc: 11, title: "Container With Most Water", slug: "container-with-most-water", difficulty: "medium", topics: ["two-pointers"], solvedDate: "2026-08-28", redoDate: "2026-08-31", redoStatus: "redone" },

  // ── Hashing — Aug 31, redone Sep 3 ──────────────────────────────────
  { id: "lc-128", lc: 128, title: "Longest Consecutive Sequence", slug: "longest-consecutive-sequence", difficulty: "medium", topics: ["hashing"], solvedDate: "2026-08-31", redoDate: "2026-09-03", redoStatus: "redone" },

  // ── Older solved, no redo tracked ───────────────────────────────────
  { id: "lc-53", lc: 53, title: "Maximum Subarray (Kadane's)", slug: "maximum-subarray", difficulty: "medium", topics: ["arrays"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-200", lc: 200, title: "Number of Islands", slug: "number-of-islands", difficulty: "medium", topics: ["bfs-dfs"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-733", lc: 733, title: "Flood Fill", slug: "flood-fill", difficulty: "easy", topics: ["bfs-dfs"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-130", lc: 130, title: "Surrounded Regions", slug: "surrounded-regions", difficulty: "medium", topics: ["bfs-dfs"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-1020", lc: 1020, title: "Number of Enclaves", slug: "number-of-enclaves", difficulty: "medium", topics: ["bfs-dfs"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-785", lc: 785, title: "Is Graph Bipartite?", slug: "is-graph-bipartite", difficulty: "medium", topics: ["bfs-dfs"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-207", lc: 207, title: "Course Schedule", slug: "course-schedule", difficulty: "medium", topics: ["topo"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-802", lc: 802, title: "Find Eventual Safe States", slug: "find-eventual-safe-states", difficulty: "medium", topics: ["topo"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-127", lc: 127, title: "Word Ladder", slug: "word-ladder", difficulty: "hard", topics: ["bfs-dfs"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "lc-1091", lc: 1091, title: "Shortest Path in Binary Matrix", slug: "shortest-path-in-binary-matrix", difficulty: "medium", topics: ["bfs-dfs"], solvedDate: null, redoDate: null, redoStatus: "untracked" },
  { id: "dijkstra-min-heap", lc: null, title: "Dijkstra with Min-Heap", difficulty: "medium", topics: ["dijkstra", "heaps"], solvedDate: null, redoDate: null, redoStatus: "untracked", note: "Implemented from scratch — lazy deletion, tuple heap." },

  // ── Pending ─────────────────────────────────────────────────────────
  { id: "lc-210", lc: 210, title: "Course Schedule II", slug: "course-schedule-ii", difficulty: "medium", topics: ["topo"], solvedDate: null, redoDate: null, redoStatus: "pending" },
  { id: "lc-126", lc: 126, title: "Word Ladder II", slug: "word-ladder-ii", difficulty: "hard", topics: ["bfs-dfs"], solvedDate: null, redoDate: null, redoStatus: "pending" },
];
