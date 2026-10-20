import { CardProps, Card } from "@/app/cards/_components/Card";

export type CardSetProps = {
  SetName: string;
  CardList: CardProps[];
};

export const CardSet = ({ SetName, CardList }: CardSetProps) => {
  return (
    <>
      <h3>{SetName}</h3>
      {CardList.map((card, index) => (
        <Card key={index} question={card.question} answer={card.answer} />
      ))}
    </>
  );
};
