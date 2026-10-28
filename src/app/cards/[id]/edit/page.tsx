import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getCardSet } from "@/lib/data";
import { CardSkeleton } from "@/lib/skeleton";

import { CardSetForm } from "../../_components/CardSetForm";

// The shell renders Navigation, which reads usePathname(), so an unknown dynamic
// segment cannot produce a static shell at build time. Allow it to block.
export const instant = false;

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <EditCardSet params={params} />
    </Suspense>
  );
}

async function EditCardSet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardSet = await getCardSet(id);

  if (!cardSet) {
    notFound();
  }

  return (
    <div>
      <h1>Edit Card Set</h1>
      <CardSetForm cardSet={cardSet} />
    </div>
  );
}
