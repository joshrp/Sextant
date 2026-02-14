
/**
 * Help topic metadata
 * This file defines the structure and organization of help topics
 */

import type { contentMap } from './contentLoader';


export interface HelpTopic {
  id: keyof typeof contentMap;
  title: string;
  description?: string;
  // Must match a key in contentMap for compile-time safety
  contentKey: keyof typeof contentMap;
  // Optional fixture file for examples
  fixturePath?: string;
  // Optional order for sorting
  order?: number;
  // Category for grouping
  category?: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  description?: string;
  order?: number;
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of the calculator',
    order: 1,
  },
  {
    id: 'advanced',
    title: 'Advanced Topics',
    description: 'Deep dives into specific features',
    order: 2,
  },
  {
    id: 'advanced-usage',
    title: 'Advanced Usage',
    description: 'Master advanced techniques and workflows',
    order: 3,
  },
  {
    id: 'reference',
    title: 'Reference',
    description: 'Technical reference and details',
    order: 4,
  },
];

export const helpTopics: HelpTopic[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    description: 'Get started with the COI Calculator',
    contentKey: 'introduction',
    category: 'getting-started',
    order: 1,
  },
  // Visual Factory Builder is not in contentMap, so omit or add a stub if needed
  {
    id: 'recycling',
    title: 'Recycling',
    description: 'Understanding how recycling works in the calculator',
    contentKey: 'recycling',
    category: 'reference',
    order: 1,
  },
  {
    id: 'manifolds',
    title: 'Manifolds',
    description: 'Understanding manifolds and how to use them',
    contentKey: 'manifolds',
    category: 'reference',
    order: 2,
  },
  {
    id: 'goals',
    title: 'Goals',
    description: 'Setting and managing production goals',
    contentKey: 'goals',
    category: 'getting-started',
    order: 3,
  },
  {
    id: 'balancer',
    title: 'Balancers',
    description: 'Using balancers for imports, exports, and resource management',
    contentKey: 'balancer',
    category: 'reference',
    order: 3,
  },
  {
    id: 'settlements',
    title: 'Settlements',
    description: 'Making Workers',
    contentKey: 'settlements',
    category: 'reference',
    order: 4,
  },
  {
    id: 'scoring',
    title: 'Scoring Methods',
    description: 'Understanding different scoring methods for optimization',
    contentKey: 'scoring',
    category: 'advanced',
    order: 1,
  },
  {
    id: 'comparing-chains',
    title: 'Comparing Production Chains',
    description: 'Techniques for comparing different production approaches',
    contentKey: 'comparing-chains',
    category: 'advanced-usage',
    order: 1,
  },
  {
    id: 'advanced-balancers',
    title: 'Advanced Balancers',
    description: 'Advanced balancer techniques and patterns',
    contentKey: 'advanced-balancers',
    category: 'advanced-usage',
    order: 2,
  },
];

/**
 * Get topics organized by category
 */
export function getTopicsByCategory(): Map<string, HelpTopic[]> {
  const map = new Map<string, HelpTopic[]>();
  
  for (const topic of helpTopics) {
    const category = topic.category || 'uncategorized';
    const topics = map.get(category) || [];
    topics.push(topic);
    map.set(category, topics);
  }
  
  // Sort topics within each category
  for (const topics of map.values()) {
    topics.sort((a, b) => (a.order || 999) - (b.order || 999));
  }
  
  return map;
}

/**
 * Get a topic by ID
 */
export function getTopicById(id: string): HelpTopic | undefined {
  return helpTopics.find(t => t.id === id);
}
