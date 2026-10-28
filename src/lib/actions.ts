"use server";

import { db } from "@/db";
import { cardSets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const CardSetSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .trim()
    .min(1, "Project name is required.")
    // The schema puts no limit on projects.name, but tasks.title caps at 200.
    .max(200, "Project name must be 200 characters or fewer."),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreateCardSetSc = CardSetSchema.omit({ id: true, createdAt: true, updatedAt: true });

export type CreateCardSetState = {
  errors?: {
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
  try {
    const { name } = validatedFields.data;
    await db.insert(cardSets).values({ name });
  } catch (error) {
    console.error("Error creating card set:", error);
    return {
      errors: { name: ["Failed to create card set."] },
      message: "Failed to create card set.",
    };
  }
  revalidatePath("/cards");
  redirect("/cards");
}

export async function updateCardSet(
  _prevState: CreateCardSetState,
  formData: FormData,
): Promise<CreateCardSetState> {
  const validatedFields = CardSetSchema.safeParse({
    id: formData.get("id"),
    userId: formData.get("userId"),
    name: formData.get("name"),
    createdAt: formData.get("createdAt"),
    updatedAt: formData.get("updatedAt"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }
  try {
    const { id, name } = validatedFields.data;
    await db.update(cardSets).set({ name }).where(eq(cardSets.id, id));
  } catch (error) {
    console.error("Error updating card set:", error);
    return {
      errors: { name: ["Failed to update card set."] },
      message: "Failed to update card set.",
    };
  }
  revalidatePath("/cards");
  redirect("/cards");
}
