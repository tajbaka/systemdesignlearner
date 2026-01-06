/**
 * Topic Definitions for Iterative Feedback
 *
 * Defines the key topics to cover for each practice step.
 * Feedback system will focus on ONE topic at a time until all are addressed.
 */

export type TopicId = string;

export type Topic = {
  id: TopicId;
  label: string;
  description: string;
  priority: number; // Higher = more important
  exampleQuestions: string[];
};

export const FUNCTIONAL_TOPICS: Topic[] = [
  {
    id: "core-functionality",
    label: "Core Functionality",
    description: "What are the main features users need?",
    priority: 10,
    exampleQuestions: [
      "What should users be able to do with this system?",
      "What are the primary use cases?",
      "What actions can users perform?",
    ],
  },
  {
    id: "user-interactions",
    label: "User Interactions",
    description: "How do users interact with the system?",
    priority: 8,
    exampleQuestions: [
      "How do users access this functionality?",
      "What inputs do users provide?",
      "What outputs do users receive?",
    ],
  },
  {
    id: "data-requirements",
    label: "Data Requirements",
    description: "What data needs to be stored and managed?",
    priority: 7,
    exampleQuestions: [
      "What information needs to be stored?",
      "How long should data be retained?",
      "What data relationships exist?",
    ],
  },
  {
    id: "edge-cases",
    label: "Edge Cases",
    description: "What happens in error or unusual scenarios?",
    priority: 5,
    exampleQuestions: [
      "What happens if a resource doesn't exist?",
      "How are duplicates handled?",
      "What are the failure scenarios?",
    ],
  },
];

export const NON_FUNCTIONAL_TOPICS: Topic[] = [
  {
    id: "throughput-scale",
    label: "Throughput & Scale",
    description: "How much traffic will the system handle?",
    priority: 10,
    exampleQuestions: [
      "How many users will use the system per day?",
      "How many requests per second do you expect?",
      "What's the split between read and write operations?",
    ],
  },
  {
    id: "latency-performance",
    label: "Latency & Performance",
    description: "How fast should the system respond?",
    priority: 9,
    exampleQuestions: [
      "What's your target response time for user requests?",
      "Are there different latency requirements for different operations?",
      "What's acceptable p95 or p99 latency?",
    ],
  },
  {
    id: "availability-reliability",
    label: "Availability & Reliability",
    description: "How often should the system be available?",
    priority: 8,
    exampleQuestions: [
      "What's your uptime target (e.g., 99.9%)?",
      "How critical is it that the system stays online?",
      "What happens if the system goes down temporarily?",
    ],
  },
  {
    id: "data-consistency",
    label: "Data Consistency",
    description: "How important is data consistency?",
    priority: 6,
    exampleQuestions: [
      "Is eventual consistency acceptable?",
      "Do you need strong consistency for all operations?",
      "What happens if two users modify data simultaneously?",
    ],
  },
];

export const API_TOPICS: Topic[] = [
  {
    id: "endpoint-coverage",
    label: "Endpoint Coverage",
    description: "Are all required operations covered?",
    priority: 10,
    exampleQuestions: [
      "What endpoints do you need for each user action?",
      "Are CRUD operations fully covered?",
      "Do you have endpoints for all functional requirements?",
    ],
  },
  {
    id: "rest-design",
    label: "REST Best Practices",
    description: "Does the API follow REST conventions?",
    priority: 7,
    exampleQuestions: [
      "Are you using appropriate HTTP methods (GET, POST, PUT, DELETE)?",
      "Are resource names plural and lowercase?",
      "Are you using proper status codes?",
    ],
  },
  {
    id: "request-response",
    label: "Request/Response Design",
    description: "Are request and response formats well-defined?",
    priority: 8,
    exampleQuestions: [
      "What data is sent in requests?",
      "What data is returned in responses?",
      "How are errors communicated to clients?",
    ],
  },
  {
    id: "api-documentation",
    label: "API Documentation",
    description: "Is the API well-documented?",
    priority: 6,
    exampleQuestions: [
      "Have you described what each endpoint does?",
      "Are parameters and responses documented?",
      "Would a developer understand how to use this API?",
    ],
  },
];

export const DESIGN_TOPICS: Topic[] = [
  {
    id: "core-components",
    label: "Core Components",
    description: "Are essential components present?",
    priority: 10,
    exampleQuestions: [
      "What components are needed to handle your throughput?",
      "Do you need a database? Which type?",
      "What about caching, load balancing, or message queues?",
    ],
  },
  {
    id: "caching-strategy",
    label: "Caching Strategy",
    description: "How is caching implemented?",
    priority: 9,
    exampleQuestions: [
      "Where should caching be placed in your architecture?",
      "What data should be cached?",
      "How will you handle cache misses?",
    ],
  },
  {
    id: "data-flow",
    label: "Data Flow",
    description: "How does data move through the system?",
    priority: 8,
    exampleQuestions: [
      "What's the path from client request to response?",
      "How does write data reach the database?",
      "How do different components communicate?",
    ],
  },
  {
    id: "scalability-patterns",
    label: "Scalability Patterns",
    description: "How will the system scale?",
    priority: 7,
    exampleQuestions: [
      "How will you handle increased load?",
      "Are you using horizontal or vertical scaling?",
      "What components need to be replicated?",
    ],
  },
];

export function getTopicsForStep(stepId: string): Topic[] {
  switch (stepId) {
    case "functional":
      return FUNCTIONAL_TOPICS;
    case "nonFunctional":
      return NON_FUNCTIONAL_TOPICS;
    case "api":
      return API_TOPICS;
    case "highLevelDesign":
    case "design":
      return DESIGN_TOPICS;
    default:
      return [];
  }
}

export function getNextUncoveredTopic(
  stepId: string,
  coveredTopics: Record<TopicId, boolean>
): Topic | null {
  const topics = getTopicsForStep(stepId);

  // Sort by priority (descending) and find first uncovered
  const sortedTopics = [...topics].sort((a, b) => b.priority - a.priority);

  for (const topic of sortedTopics) {
    if (!coveredTopics[topic.id]) {
      return topic;
    }
  }

  // All topics covered
  return null;
}
