import type { Message } from "ai";

export const ciData: { input: Message[]; expected: string }[] = [
  {
    input: [
      {
        id: "1",
        role: "user",
        content:
          "The same year the Berlin Wall fell, which team won the NBA Finals?",
      },
    ],
    expected:
      "Detroit Pistons. The Berlin Wall fell in 1989, and the Detroit Pistons won the 1989 NBA Finals, defeating the Los Angeles Lakers.",
  },
  {
    input: [
      {
        id: "2",
        role: "user",
        content:
          "Name a U.S. president born in the same state as the author of The Old Man and the Sea.",
      },
    ],
    expected:
      "Ronald Reagan. Ernest Hemingway (author of The Old Man and the Sea) was born in Oak Park, Illinois, and Ronald Reagan was also born in Illinois (Tampico, Illinois).",
  },
  {
    input: [
      {
        id: "3",
        role: "user",
        content:
          "What currency does the country whose highest point is Mount Kilimanjaro use?",
      },
    ],
    expected:
      "Tanzanian shilling (TZS). Mount Kilimanjaro is located in Tanzania, and Tanzania's official currency is the Tanzanian shilling.",
  },
  {
    input: [
      {
        id: "4",
        role: "user",
        content:
          "Who shared the Nobel Prize in Physics the year Apple released the first iPhone?",
      },
    ],
    expected:
      "Albert Fert and Peter Grünberg. Apple released the first iPhone in 2007, and the 2007 Nobel Prize in Physics was awarded to Albert Fert and Peter Grünberg for their discovery of giant magnetoresistance.",
  },
]; 