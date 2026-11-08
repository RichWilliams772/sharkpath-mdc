// "I don't know what I want" quiz.
// Each answer adds interest traits (matched against every career's traits)
// and, for the school-length question, a preferred path length (track).
// Content owner: PM/Pitch team (quiz questions + Spanish review in src/i18n/es.ts).

import type { QuizQuestion } from "@/types/roadmap";

export const QUIZ: QuizQuestion[] = [
  {
    id: "problem",
    prompt: "Which kind of problem would you most like to solve at work?",
    options: [
      { id: "health", label: "Someone is sick, hurt or struggling", traits: ["helping", "hands-on"] },
      { id: "system", label: "A computer system or app isn’t working", traits: ["tech", "analyzing"] },
      { id: "space", label: "A building, product or space needs to look and work better", traits: ["designing", "building"] },
      { id: "plan", label: "A team or business needs a plan and a budget", traits: ["organizing", "analyzing"] },
      { id: "fix", label: "Something physical is broken and needs fixing", traits: ["hands-on", "building"] },
    ],
  },
  {
    id: "focus",
    prompt: "What would you rather spend your workday working with?",
    options: [
      { id: "people", label: "People — teaching, caring for or helping them", traits: ["helping"] },
      { id: "data", label: "Data, numbers and ideas", traits: ["analyzing"] },
      { id: "things", label: "Tools, machines and materials", traits: ["hands-on", "building"] },
      { id: "art", label: "Art, media and self-expression", traits: ["creating", "designing"] },
      { id: "tech", label: "Computers and technology", traits: ["tech"] },
    ],
  },
  {
    id: "subject",
    prompt: "Which classes do you actually enjoy (or did)?",
    options: [
      { id: "bio", label: "Biology, anatomy or health science", traits: ["helping", "analyzing"] },
      { id: "math", label: "Math, physics or computer science", traits: ["analyzing", "tech"] },
      { id: "art", label: "Art, design, music or media", traits: ["creating", "designing"] },
      { id: "social", label: "Psychology, history or government", traits: ["helping", "organizing"] },
      { id: "lab", label: "Shop, culinary or any hands-on lab", traits: ["hands-on", "creating"] },
    ],
  },
  {
    id: "place",
    prompt: "Where can you picture yourself working most days?",
    options: [
      { id: "care", label: "A hospital, clinic or school, with lots of people", traits: ["helping"] },
      { id: "desk", label: "An office or from home at a computer", traits: ["tech", "analyzing"] },
      { id: "outside", label: "Outdoors, on job sites or on the move", traits: ["building", "hands-on"] },
      { id: "studio", label: "A studio, kitchen or stage", traits: ["creating", "hands-on"] },
      { id: "field", label: "Out in the community responding to whatever comes up", traits: ["helping", "hands-on", "organizing"] },
    ],
  },
  {
    id: "learn",
    prompt: "How do you learn something new best?",
    options: [
      { id: "doing", label: "By doing it with my hands", traits: ["hands-on"] },
      { id: "figuring", label: "By figuring out how it works step by step", traits: ["analyzing", "tech"] },
      { id: "making", label: "By experimenting and making my own version", traits: ["creating", "designing"] },
      { id: "talking", label: "By talking it through with other people", traits: ["helping", "organizing"] },
    ],
  },
  {
    id: "proud",
    prompt: "What would make you proudest at the end of a workday?",
    options: [
      { id: "helped", label: "I helped someone feel better, safer or understood", traits: ["helping"] },
      { id: "built", label: "I built or fixed something real", traits: ["building", "hands-on"] },
      { id: "solved", label: "I cracked a hard problem nobody else could", traits: ["analyzing", "tech"] },
      { id: "made", label: "I made something original people loved", traits: ["creating", "designing"] },
      { id: "led", label: "I kept a team and project on track", traits: ["organizing"] },
    ],
  },
  {
    id: "values",
    prompt: "What matters most to you in a career?",
    options: [
      { id: "community", label: "Making a difference in my community", traits: ["helping"] },
      { id: "pay", label: "High pay and lots of room to grow", traits: ["analyzing", "tech"] },
      { id: "freedom", label: "Creative freedom", traits: ["creating", "designing"] },
      { id: "stability", label: "Stability and clear steps to move up", traits: ["organizing"] },
      { id: "active", label: "Staying active — not sitting at a desk all day", traits: ["hands-on", "building"] },
    ],
  },
  {
    id: "pressure",
    prompt: "Which kind of pressure could you handle best?",
    options: [
      { id: "emergency", label: "Emergencies where people are counting on me", traits: ["helping", "hands-on"] },
      { id: "deadline", label: "Deadlines and big launches", traits: ["tech", "organizing"] },
      { id: "physical", label: "Physical work in the heat or tough conditions", traits: ["building", "hands-on"] },
      { id: "critique", label: "Feedback and critiques on my creative work", traits: ["creating", "designing"] },
      { id: "detail", label: "Details and numbers that have to be exactly right", traits: ["analyzing", "organizing"] },
    ],
  },
  {
    id: "team",
    prompt: "On a group project, you’re usually the one who…",
    options: [
      { id: "lead", label: "Organizes everyone and keeps it on track", traits: ["organizing"] },
      { id: "ideas", label: "Comes up with the ideas and the look", traits: ["creating", "designing"] },
      { id: "works", label: "Makes it actually work", traits: ["tech", "building"] },
      { id: "support", label: "Makes sure everyone’s heard and okay", traits: ["helping"] },
      { id: "research", label: "Digs up the facts and checks the work", traits: ["analyzing"] },
    ],
  },
  {
    id: "school",
    prompt: "How much school after high school are you up for?",
    options: [
      { id: "fast", label: "Get working fast — a certificate or 2-year degree", traits: [], tracks: ["certificate", "as"] },
      { id: "four", label: "About 4 years for a bachelor’s degree", traits: [], tracks: ["transfer"] },
      { id: "long", label: "Whatever it takes — even grad or professional school", traits: [], tracks: ["graduate"] },
      { id: "unsure", label: "Not sure yet", traits: [] },
    ],
  },
];
