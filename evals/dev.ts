import type { Message } from "ai";

export const devData: { input: Message[]; expected: string }[] = [
  // Most challenging multi-hop reasoning cases for dev testing
  {
    input: [
      {
        id: "1",
        role: "user",
        content:
          "Identify the capital city of the U.S. state whose two-letter postal abbreviation matches the chemical symbol of the element with atomic number 31.",
      },
    ],
    expected:
      "Atlanta. Atomic number 31 is Gallium (chemical symbol Ga), which matches Georgia's postal abbreviation GA, and Atlanta is Georgia's capital city.",
  },
  {
    input: [
      {
        id: "2",
        role: "user",
        content:
          "Multiply the number of letters in the English name of the element whose symbol is Fe by the number of official national languages of Switzerland.",
      },
    ],
    expected:
      "16. Fe is the symbol for Iron (4 letters), and Switzerland has 4 official national languages (German, French, Italian, and Romansh). 4 × 4 = 16.",
  },
  {
    input: [
      {
        id: "3",
        role: "user",
        content:
          "What is the family (taxonomic) of the bird that is the state bird of the U.S. state nicknamed 'The Garden State'?",
      },
    ],
    expected:
      "Fringillidae. New Jersey is nicknamed 'The Garden State', its state bird is the American Goldfinch, and goldfinches belong to the family Fringillidae.",
  },
  {
    input: [
      {
        id: "4",
        role: "user",
        content:
          "What is the architectural style of the building where the author of '1984' was born?",
      },
    ],
    expected:
      "Colonial architecture. George Orwell (author of '1984') was born in Motihari, India, which was part of British India and features colonial British architecture from that period.",
  },
]; 