"use server";

import { db } from "@/db";
import { cardSets, cards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const CardSetSchema = z.object({
  id: z.uuid("Invalid card set."),
  name: z
    .string()
    .trim()
    .min(1, "Project name is required.")
    // The schema puts no limit on projects.name, but tasks.title caps at 200.
    .max(200, "Project name must be 200 characters or fewer."),
});

const CreateCardSetSc = CardSetSchema.omit({ id: true });

export type CreateCardSetState = {
  errors?: {
    id?: string[];
    name?: string[];
    description?: string[];
  };
  message: string | null;
};

export async function createCardSet(
  _prevState: CreateCardSetState,
  formData: FormData,
): Promise<CreateCardSetState> {
  const validatedFields = CreateCardSetSc.safeParse({
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }
  let createdId: string | null = null;
  try {
    const { name } = validatedFields.data;
    const [created] = await db.insert(cardSets).values({ name }).returning({ id: cardSets.id });
    createdId = created?.id ?? null;
  } catch (error) {
    console.error("Error creating card set:", error);
    return {
      errors: { name: ["Failed to create card set."] },
      message: "Failed to create card set.",
    };
  }

  if (!createdId) {
    return {
      errors: { name: ["Failed to create card set."] },
      message: "Failed to create card set.",
    };
  }

  revalidatePath("/cards");
  redirect(`/cards/${createdId}`);
}

export async function updateCardSet(
  _prevState: CreateCardSetState,
  formData: FormData,
): Promise<CreateCardSetState> {
  const validatedFields = CardSetSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  const { id, name } = validatedFields.data;

  try {
    await db.update(cardSets).set({ name }).where(eq(cardSets.id, id));
  } catch (error) {
    console.error("Error updating card set:", error);
    return {
      errors: { name: ["Failed to update card set."] },
      message: "Failed to update card set.",
    };
  }

  revalidatePath("/cards");
  revalidatePath(`/cards/${id}`);
  redirect(`/cards/${id}`);
}

const CreateCardSchema = z.object({
  cardSetId: z.uuid("Invalid card set."),
  question: z.string().trim().min(1, "Question is required."),
  answer: z.string().trim().min(1, "Answer is required."),
});

export type CreateCardState = {
  errors?: {
    cardSetId?: string[];
    question?: string[];
    answer?: string[];
  };
  message: string | null;
};

export async function createCard(
  _prevState: CreateCardState,
  formData: FormData,
): Promise<CreateCardState> {
  const validatedFields = CreateCardSchema.safeParse({
    cardSetId: formData.get("cardSetId"),
    question: formData.get("question"),
    answer: formData.get("answer"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  const { cardSetId, question, answer } = validatedFields.data;

  try {
    await db.insert(cards).values({ cardSetId, question, answer });
  } catch (error) {
    console.error("Error adding card:", error);
    return {
      errors: { question: ["Failed to add card."] },
      message: "Failed to add card.",
    };
  }

  revalidatePath(`/cards/${cardSetId}`);
  return { message: "Card added." };
}
