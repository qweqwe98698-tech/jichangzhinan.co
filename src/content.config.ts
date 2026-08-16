import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum([
      'recommendations',
      'lines',
      'scenarios',
      'clients',
      'protocols',
      'routing',
      'tools',
      'security',
      'beginner'
    ]),
    categoryName: z.string().optional(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    author: z.string().default('机场指南编辑部'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']).default('Beginner'),
    readingTime: z.string().default('8 MIN READ'),
    related: z.array(z.string()).default([]),
    keyProblems: z.array(z.string()).default([]),
    faq: z.array(z.object({
      q: z.string(),
      a: z.string()
    })).default([]),
    badge: z.string().optional()
  })
});

export const collections = {
  posts
};
