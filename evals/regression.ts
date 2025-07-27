import type { UIMessage } from "ai";

export const regressionData: { input: any[]; expected: string }[] = [
  {
    input: [
      {
        id: "1",
        role: "user",
        content:
          "What are the latest developments in autonomous vehicle safety regulations?",
      },
    ],
    expected:
      "Recent developments include updated NHTSA guidelines, EU's new AV regulatory framework, mandatory safety assessments, and requirements for remote monitoring systems.",
  },
  {
    input: [
      {
        id: "2",
        role: "user",
        content:
          "What are the environmental benefits and drawbacks of nuclear energy?",
      },
    ],
    expected:
      "Benefits include zero carbon emissions during operation and high energy density. Drawbacks include radioactive waste disposal, potential accidents, and water usage for cooling.",
  },
  {
    input: [
      {
        id: "3",
        role: "user",
        content:
          "How does blockchain technology ensure transaction security?",
      },
    ],
    expected:
      "Blockchain ensures security through cryptographic hashing, distributed consensus mechanisms, immutability of records, and decentralized validation across multiple nodes.",
  },
  {
    input: [
      {
        id: "4",
        role: "user",
        content:
          "What are the latest advances in Alzheimer's disease treatment?",
      },
    ],
    expected:
      "Recent advances include FDA-approved drugs like Leqembi and Aduhelm targeting amyloid plaques, new blood biomarker tests, and promising immunotherapy approaches."
  },
]; 