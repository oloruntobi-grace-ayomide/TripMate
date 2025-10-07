import { z } from "zod"

export const TripCard = z.object({
  city: z.string(),
  summary: z.string(),
  packingAdvice: z.array(z.string()),
  cautions: z.array(z.string()).default([]),
});

export const PackingItem = z.object({
  item: z.string(),
  reason: z.string(),
});

export const PackingList = z.array(PackingItem);
