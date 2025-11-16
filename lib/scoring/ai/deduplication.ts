/**
 * Feedback Deduplication & Merging
 *
 * Removes duplicate feedback messages and merges similar items
 * to avoid overwhelming users with repetitive information.
 */

import type { FeedbackItem } from "../types";

/**
 * Calculate similarity between two strings (0-1)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  // Simple word overlap similarity
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Check if two feedback items are duplicates
 */
function areDuplicates(item1: FeedbackItem, item2: FeedbackItem): boolean {
  // Exact match
  if (item1.message === item2.message) return true;

  // Same category and related entity
  if (item1.relatedTo && item1.relatedTo === item2.relatedTo) {
    const similarity = stringSimilarity(item1.message, item2.message);
    if (similarity > 0.7) return true;
  }

  // High message similarity
  const similarity = stringSimilarity(item1.message, item2.message);
  return similarity > 0.85;
}

/**
 * Merge similar feedback items
 */
function mergeFeedbackItems(items: FeedbackItem[]): FeedbackItem {
  // Use the first item as base
  const base = items[0];

  // Collect unique actionables
  const actionables = items
    .map((item) => item.actionable)
    .filter((a): a is string => !!a)
    .filter((a, i, arr) => arr.indexOf(a) === i);

  return {
    ...base,
    actionable: actionables.length > 0 ? actionables.join(" ") : base.actionable,
  };
}

/**
 * Deduplicate feedback array
 */
export function deduplicateFeedback(feedback: FeedbackItem[]): FeedbackItem[] {
  if (feedback.length === 0) return [];

  const deduplicated: FeedbackItem[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < feedback.length; i++) {
    if (processed.has(i)) continue;

    const current = feedback[i];
    const duplicates: FeedbackItem[] = [current];

    // Find all duplicates of current item
    for (let j = i + 1; j < feedback.length; j++) {
      if (processed.has(j)) continue;

      if (areDuplicates(current, feedback[j])) {
        duplicates.push(feedback[j]);
        processed.add(j);
      }
    }

    // Merge duplicates if found
    if (duplicates.length > 1) {
      deduplicated.push(mergeFeedbackItems(duplicates));
    } else {
      deduplicated.push(current);
    }

    processed.add(i);
  }

  return deduplicated;
}

/**
 * Prioritize feedback items (most important first)
 */
export function prioritizeFeedback(feedback: FeedbackItem[]): FeedbackItem[] {
  const severityOrder = { blocking: 0, warning: 1, positive: 2, info: 3 };
  const categoryOrder = { requirement: 0, architecture: 1, performance: 2, bestPractice: 3 };

  return [...feedback].sort((a, b) => {
    // First by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // Then by category
    return categoryOrder[a.category] - categoryOrder[b.category];
  });
}

/**
 * Consolidate rule-based and AI feedback
 */
export function consolidateFeedback(
  ruleBasedFeedback: FeedbackItem[],
  aiFeedback: FeedbackItem[]
): FeedbackItem[] {
  // Combine all feedback
  const allFeedback = [...ruleBasedFeedback, ...aiFeedback];

  // Deduplicate
  const deduplicated = deduplicateFeedback(allFeedback);

  // Prioritize
  const prioritized = prioritizeFeedback(deduplicated);

  // Limit to top 5 per severity
  return prioritized;
}

/**
 * Extract key points from AI feedback (avoid repeating rule-based)
 */
export function extractUniqueAIInsights(
  ruleBasedMessages: string[],
  aiMessages: string[]
): string[] {
  const unique: string[] = [];

  for (const aiMsg of aiMessages) {
    // Check if AI message adds new information
    const isDuplicate = ruleBasedMessages.some((ruleMsg) => {
      const similarity = stringSimilarity(aiMsg, ruleMsg);
      return similarity > 0.6;
    });

    if (!isDuplicate) {
      unique.push(aiMsg);
    }
  }

  return unique;
}

/**
 * Simplify feedback message (remove redundancy)
 */
export function simplifyMessage(message: string): string {
  // Remove "endpoint: " prefix redundancy
  let simplified = message.replace(/^endpoint:\s*[^,]+,\s*issue:\s*/i, "");

  // Remove "recommendation: " if it repeats the issue
  simplified = simplified.replace(/,\s*recommendation:\s*[^.]+\./i, "");

  // Clean up extra spaces
  simplified = simplified.replace(/\s+/g, " ").trim();

  return simplified;
}

/**
 * Group related feedback by endpoint/component
 */
export function groupFeedbackByContext(feedback: FeedbackItem[]): Map<string, FeedbackItem[]> {
  const grouped = new Map<string, FeedbackItem[]>();

  for (const item of feedback) {
    const key = item.relatedTo || "general";
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  }

  return grouped;
}

/**
 * Merge grouped feedback into concise messages
 */
export function mergeGroupedFeedback(grouped: Map<string, FeedbackItem[]>): FeedbackItem[] {
  const merged: FeedbackItem[] = [];

  for (const [context, items] of grouped.entries()) {
    if (items.length === 1) {
      merged.push({
        ...items[0],
        message: simplifyMessage(items[0].message),
      });
    } else {
      // Combine multiple issues for same context
      const messages = items.map((item) => simplifyMessage(item.message));
      const uniqueMessages = [...new Set(messages)];

      const combinedMessage =
        context !== "general"
          ? `${context}: ${uniqueMessages.join("; ")}`
          : uniqueMessages.join("; ");

      merged.push({
        category: items[0].category,
        severity: items[0].severity,
        message: combinedMessage,
        relatedTo: context !== "general" ? context : undefined,
        actionable: items.find((i) => i.actionable)?.actionable,
      });
    }
  }

  return merged;
}
