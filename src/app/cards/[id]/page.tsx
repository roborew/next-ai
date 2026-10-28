import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getCardSet, listCardsForSet } from "@/lib/data";
import { CardSkeleton } from "@/lib/skeleton";

import { CardSetDetail } from "../_components/CardSetDetail";

// The shell renders Navigation, which reads usePathname(), so an unknown dynamic
// segment cannot produce a static shell at build time. Allow it to block.
export const instant = false;

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <CardSetContent params={params} />
    </Suspense>
  );
}

async function CardSetContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardSet = await getCardSet(id);

  if (!cardSet) {
    notFound();
  }

  const cards = await listCardsForSet(id);

  return <CardSetDetail cardSet={cardSet} cards={cards} />;
}
