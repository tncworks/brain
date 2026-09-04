/**
 * Fresh-problem bank for the "queue is empty" mails. Grouped by topic; the
 * nag picks a random topic you've covered, then a problem you haven't logged.
 * All free-tier LeetCode problems.
 */
import type { Difficulty, TopicId } from "./data";

export interface Suggestion {
  lc: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
}

export const SUGGESTIONS: Partial<Record<TopicId, Suggestion[]>> = {
  arrays: [
    { lc: 1, title: "Two Sum", slug: "two-sum", difficulty: "easy" },
    { lc: 189, title: "Rotate Array", slug: "rotate-array", difficulty: "medium" },
    { lc: 283, title: "Move Zeroes", slug: "move-zeroes", difficulty: "easy" },
    { lc: 152, title: "Maximum Product Subarray", slug: "maximum-product-subarray", difficulty: "medium" },
    { lc: 56, title: "Merge Intervals", slug: "merge-intervals", difficulty: "medium" },
  ],
  strings: [
    { lc: 242, title: "Valid Anagram", slug: "valid-anagram", difficulty: "easy" },
    { lc: 125, title: "Valid Palindrome", slug: "valid-palindrome", difficulty: "easy" },
    { lc: 49, title: "Group Anagrams", slug: "group-anagrams", difficulty: "medium" },
    { lc: 5, title: "Longest Palindromic Substring", slug: "longest-palindromic-substring", difficulty: "medium" },
    { lc: 14, title: "Longest Common Prefix", slug: "longest-common-prefix", difficulty: "easy" },
  ],
  hashing: [
    { lc: 217, title: "Contains Duplicate", slug: "contains-duplicate", difficulty: "easy" },
    { lc: 347, title: "Top K Frequent Elements", slug: "top-k-frequent-elements", difficulty: "medium" },
    { lc: 205, title: "Isomorphic Strings", slug: "isomorphic-strings", difficulty: "easy" },
    { lc: 383, title: "Ransom Note", slug: "ransom-note", difficulty: "easy" },
    { lc: 36, title: "Valid Sudoku", slug: "valid-sudoku", difficulty: "medium" },
  ],
  "prefix-sums": [
    { lc: 303, title: "Range Sum Query - Immutable", slug: "range-sum-query-immutable", difficulty: "easy" },
    { lc: 523, title: "Continuous Subarray Sum", slug: "continuous-subarray-sum", difficulty: "medium" },
    { lc: 974, title: "Subarray Sums Divisible by K", slug: "subarray-sums-divisible-by-k", difficulty: "medium" },
    { lc: 724, title: "Find Pivot Index", slug: "find-pivot-index", difficulty: "easy" },
    { lc: 1480, title: "Running Sum of 1d Array", slug: "running-sum-of-1d-array", difficulty: "easy" },
  ],
  "two-pointers": [
    { lc: 15, title: "3Sum", slug: "3sum", difficulty: "medium" },
    { lc: 167, title: "Two Sum II - Input Array Is Sorted", slug: "two-sum-ii-input-array-is-sorted", difficulty: "medium" },
    { lc: 42, title: "Trapping Rain Water", slug: "trapping-rain-water", difficulty: "hard" },
    { lc: 26, title: "Remove Duplicates from Sorted Array", slug: "remove-duplicates-from-sorted-array", difficulty: "easy" },
    { lc: 977, title: "Squares of a Sorted Array", slug: "squares-of-a-sorted-array", difficulty: "easy" },
  ],
  "sliding-window": [
    { lc: 239, title: "Sliding Window Maximum", slug: "sliding-window-maximum", difficulty: "hard" },
    { lc: 1004, title: "Max Consecutive Ones III", slug: "max-consecutive-ones-iii", difficulty: "medium" },
    { lc: 438, title: "Find All Anagrams in a String", slug: "find-all-anagrams-in-a-string", difficulty: "medium" },
    { lc: 904, title: "Fruit Into Baskets", slug: "fruit-into-baskets", difficulty: "medium" },
    { lc: 1456, title: "Maximum Number of Vowels in a Substring of Given Length", slug: "maximum-number-of-vowels-in-a-substring-of-given-length", difficulty: "medium" },
  ],
  "stacks-queues": [
    { lc: 20, title: "Valid Parentheses", slug: "valid-parentheses", difficulty: "easy" },
    { lc: 155, title: "Min Stack", slug: "min-stack", difficulty: "medium" },
    { lc: 150, title: "Evaluate Reverse Polish Notation", slug: "evaluate-reverse-polish-notation", difficulty: "medium" },
    { lc: 232, title: "Implement Queue using Stacks", slug: "implement-queue-using-stacks", difficulty: "easy" },
    { lc: 394, title: "Decode String", slug: "decode-string", difficulty: "medium" },
  ],
  "monotonic-stack": [
    { lc: 739, title: "Daily Temperatures", slug: "daily-temperatures", difficulty: "medium" },
    { lc: 496, title: "Next Greater Element I", slug: "next-greater-element-i", difficulty: "easy" },
    { lc: 84, title: "Largest Rectangle in Histogram", slug: "largest-rectangle-in-histogram", difficulty: "hard" },
    { lc: 901, title: "Online Stock Span", slug: "online-stock-span", difficulty: "medium" },
    { lc: 402, title: "Remove K Digits", slug: "remove-k-digits", difficulty: "medium" },
  ],
  "linked-lists": [
    { lc: 206, title: "Reverse Linked List", slug: "reverse-linked-list", difficulty: "easy" },
    { lc: 21, title: "Merge Two Sorted Lists", slug: "merge-two-sorted-lists", difficulty: "easy" },
    { lc: 141, title: "Linked List Cycle", slug: "linked-list-cycle", difficulty: "easy" },
    { lc: 19, title: "Remove Nth Node From End of List", slug: "remove-nth-node-from-end-of-list", difficulty: "medium" },
    { lc: 143, title: "Reorder List", slug: "reorder-list", difficulty: "medium" },
    { lc: 2, title: "Add Two Numbers", slug: "add-two-numbers", difficulty: "medium" },
  ],
  "binary-search": [
    { lc: 704, title: "Binary Search", slug: "binary-search", difficulty: "easy" },
    { lc: 33, title: "Search in Rotated Sorted Array", slug: "search-in-rotated-sorted-array", difficulty: "medium" },
    { lc: 153, title: "Find Minimum in Rotated Sorted Array", slug: "find-minimum-in-rotated-sorted-array", difficulty: "medium" },
    { lc: 875, title: "Koko Eating Bananas", slug: "koko-eating-bananas", difficulty: "medium" },
    { lc: 74, title: "Search a 2D Matrix", slug: "search-a-2d-matrix", difficulty: "medium" },
    { lc: 34, title: "Find First and Last Position of Element in Sorted Array", slug: "find-first-and-last-position-of-element-in-sorted-array", difficulty: "medium" },
  ],
  bst: [
    { lc: 98, title: "Validate Binary Search Tree", slug: "validate-binary-search-tree", difficulty: "medium" },
    { lc: 230, title: "Kth Smallest Element in a BST", slug: "kth-smallest-element-in-a-bst", difficulty: "medium" },
    { lc: 235, title: "Lowest Common Ancestor of a Binary Search Tree", slug: "lowest-common-ancestor-of-a-binary-search-tree", difficulty: "medium" },
    { lc: 700, title: "Search in a Binary Search Tree", slug: "search-in-a-binary-search-tree", difficulty: "easy" },
    { lc: 108, title: "Convert Sorted Array to Binary Search Tree", slug: "convert-sorted-array-to-binary-search-tree", difficulty: "easy" },
  ],
  heaps: [
    { lc: 215, title: "Kth Largest Element in an Array", slug: "kth-largest-element-in-an-array", difficulty: "medium" },
    { lc: 23, title: "Merge k Sorted Lists", slug: "merge-k-sorted-lists", difficulty: "hard" },
    { lc: 295, title: "Find Median from Data Stream", slug: "find-median-from-data-stream", difficulty: "hard" },
    { lc: 973, title: "K Closest Points to Origin", slug: "k-closest-points-to-origin", difficulty: "medium" },
    { lc: 1046, title: "Last Stone Weight", slug: "last-stone-weight", difficulty: "easy" },
  ],
  "bfs-dfs": [
    { lc: 994, title: "Rotting Oranges", slug: "rotting-oranges", difficulty: "medium" },
    { lc: 695, title: "Max Area of Island", slug: "max-area-of-island", difficulty: "medium" },
    { lc: 133, title: "Clone Graph", slug: "clone-graph", difficulty: "medium" },
    { lc: 417, title: "Pacific Atlantic Water Flow", slug: "pacific-atlantic-water-flow", difficulty: "medium" },
    { lc: 542, title: "01 Matrix", slug: "01-matrix", difficulty: "medium" },
    { lc: 1971, title: "Find if Path Exists in Graph", slug: "find-if-path-exists-in-graph", difficulty: "easy" },
  ],
  topo: [
    { lc: 310, title: "Minimum Height Trees", slug: "minimum-height-trees", difficulty: "medium" },
    { lc: 2115, title: "Find All Possible Recipes from Given Supplies", slug: "find-all-possible-recipes-from-given-supplies", difficulty: "medium" },
    { lc: 1462, title: "Course Schedule IV", slug: "course-schedule-iv", difficulty: "medium" },
    { lc: 851, title: "Loud and Rich", slug: "loud-and-rich", difficulty: "medium" },
  ],
  dijkstra: [
    { lc: 743, title: "Network Delay Time", slug: "network-delay-time", difficulty: "medium" },
    { lc: 787, title: "Cheapest Flights Within K Stops", slug: "cheapest-flights-within-k-stops", difficulty: "medium" },
    { lc: 1631, title: "Path With Minimum Effort", slug: "path-with-minimum-effort", difficulty: "medium" },
    { lc: 778, title: "Swim in Rising Water", slug: "swim-in-rising-water", difficulty: "hard" },
    { lc: 1514, title: "Path with Maximum Probability", slug: "path-with-maximum-probability", difficulty: "medium" },
  ],
  recursion: [
    { lc: 509, title: "Fibonacci Number", slug: "fibonacci-number", difficulty: "easy" },
    { lc: 50, title: "Pow(x, n)", slug: "powx-n", difficulty: "medium" },
    { lc: 344, title: "Reverse String", slug: "reverse-string", difficulty: "easy" },
    { lc: 779, title: "K-th Symbol in Grammar", slug: "k-th-symbol-in-grammar", difficulty: "medium" },
    { lc: 231, title: "Power of Two", slug: "power-of-two", difficulty: "easy" },
  ],
};
