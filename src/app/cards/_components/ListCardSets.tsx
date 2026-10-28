import Link from "next/link";
import { listCardSets } from "@/lib/data";

export const ListCardSets = async () => {
  const cardSets = await listCardSets();

  if (cardSets.length === 0) {
    return <p>No card sets yet. Create one to get started.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {cardSets.map((set) => (
        <Link
          key={set.id}
          href={`/cards/${set.id}`}
          className="block p-4 border rounded shadow hover:bg-gray-100"
        >
          <h3 className="font-medium">{set.name}</h3>
        </Link>
      ))}
    </div>
  );
};
