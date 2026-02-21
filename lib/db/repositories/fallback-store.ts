import { hashPassword } from "@/lib/auth/password";

export type FallbackUser = {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
};

export type FallbackCategory = {
  id: number;
  userId: number;
  name: string;
};

export type FallbackBookmark = {
  id: number;
  userId: number;
  title: string;
  url: string;
  description: string;
  tags: string[];
  categoryId: number | null;
  createdAt: number;
};

const now = Math.floor(Date.now() / 1000);

export const fallbackStore: {
  users: FallbackUser[];
  categories: FallbackCategory[];
  bookmarks: FallbackBookmark[];
} = {
  users: [
    {
      id: 1,
      username: "demo",
      email: "demo@example.local",
      passwordHash: hashPassword("Demo@123456")
    },
    {
      id: 2,
      username: "legacy",
      email: "legacy@example.local",
      passwordHash: hashPassword("Legacy@123456")
    }
  ],
  categories: [
    { id: 1, userId: 1, name: "Design Resources" },
    { id: 2, userId: 1, name: "Development" }
  ],
  bookmarks: [
    {
      id: 1,
      userId: 1,
      title: "Figma",
      url: "https://figma.com/files/project-alpha",
      description: "Collaborative interface design tool.",
      tags: ["design", "ui"],
      categoryId: 1,
      createdAt: now - 120
    },
    {
      id: 2,
      userId: 1,
      title: "Dribbble Inspiration",
      url: "https://dribbble.com/shots/popular",
      description: "Discover inspiration from top designers.",
      tags: ["inspiration"],
      categoryId: 1,
      createdAt: now - 3600
    },
    {
      id: 3,
      userId: 1,
      title: "UX Collective",
      url: "https://medium.com/ux-collective",
      description: "Curated UX stories and product design articles.",
      tags: ["reading"],
      categoryId: null,
      createdAt: now - 7200
    }
  ]
};

export function nextFallbackId(values: Array<{ id: number }>) {
  const maxId = values.reduce((max, current) => Math.max(max, current.id), 0);
  return maxId + 1;
}
