import { listCardSets } from "@/lib/data";
export const ListCardSets = async () => {
  const cardSets = await listCardSets();

  return (
    <div className="flex flex-col gap-4">
      {cardSets.map((set) => (
        <div key={set.id} className="p-4 border rounded shadow hover:bg-gray-100 cursor-pointer">
          <h3 className="font-medium">{set.name}</h3>
        </div>
      ))}
    </div>
  );
};
