import type { Message } from "ai";

export const regressionData: { input: Message[]; expected: string }[] = [
  {
    input: [
      {
        id: "1",
        role: "user",
        content:
          "How many years older is Elon Musk than Mark Zuckerberg?",
      },
    ],
    expected:
      "13 years. Elon Musk was born on June 28, 1971, and Mark Zuckerberg was born on May 14, 1984, making Musk about 13 years older.",
  },
  {
    input: [
      {
        id: "2",
        role: "user",
        content:
          "Which country has the larger population today: the one whose capital is Ottawa or the one whose capital is Canberra?",
      },
    ],
    expected:
      "Canada (capital Ottawa) has a larger population than Australia (capital Canberra). Canada has approximately 41.5 million people compared to Australia's approximately 27.4 million people.",
  },
  {
    input: [
      {
        id: "3",
        role: "user",
        content:
          "Which city hosted the Winter Olympics in the year Nelson Mandela became President of South Africa?",
      },
    ],
    expected:
      "Lillehammer, Norway. Nelson Mandela was inaugurated as President of South Africa on May 10, 1994, and the 1994 Winter Olympics were held in Lillehammer, Norway.",
  },
  {
    input: [
      {
        id: "4",
        role: "user",
        content:
          "Which planet has a moon named after the Roman goddess of wisdom, and what is that planet's position from the Sun?",
      },
    ],
    expected:
      "Jupiter is the 5th planet from the Sun and has a moon named Minerva (named after the Roman goddess of wisdom). However, if referring to major moons, Jupiter's moon Europa is sometimes associated with wisdom themes, and Jupiter remains the 5th planet from the Sun.",
  },
]; 