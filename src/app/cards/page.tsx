import Link from "next/link";
import { ListCardSets } from "./_components/ListCardSets";
import { Suspense } from "react";
import { CardSkeleton } from "@/lib/skeleton";

export default function Page() {
  return (
    <div>
      <Link
        href="/cards/new"
        className="mb-4 inline-block bg-blue-500 text-white px-4 py-2 rounded"
      >
        Create New Cardset
      </Link>
      <Suspense fallback={<CardSkeleton />}>
        <ListCardSets />
      </Suspense>
    </div>
  );
}
