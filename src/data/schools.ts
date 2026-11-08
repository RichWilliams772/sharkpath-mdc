// ⚠️ Sample college directory — tuition per credit hour (tuition + required fees),
// rounded from public tuition pages for 2026–27 planning. The Data team should
// replace this with Tiger Data rows (e.g. from the College Scorecard API).
// Any college not listed can be added by the student; it uses NATIONAL_AVERAGES.

import type { School, Sourced, StateCode } from "@/types/roadmap";
import { SOURCES as S } from "./sources";

export const US_STATES: { code: StateCode; name: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"],
  ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"],
  ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"],
  ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"],
  ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"],
  ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }));

export const stateName = (code: StateCode) => US_STATES.find((s) => s.code === code)?.name ?? code;

const rate = (value: number, source = S.collegeTuition): Sourced => ({ value, unit: "USD/credit", source });

function school(
  id: string,
  name: string,
  shortName: string,
  state: StateCode,
  city: string,
  kind: School["kind"],
  inState: number,
  outOfState: number,
): School {
  return { id, name, shortName, state, city, kind, tuitionPerCredit: { inState: rate(inState), outOfState: rate(outOfState) } };
}

export const SCHOOLS: School[] = [
  // ── Community colleges (start here) ──
  // MDC: verified 2026-11-08 ("Total Cost Per Credit", tuition + per-credit fees).
  {
    ...school("mdc", "Miami Dade College", "MDC", "FL", "Miami", "community", 118.22, 402.51),
    tuitionPerCredit: { inState: rate(118.22, S.mdcTuitionPerCredit), outOfState: rate(402.51, S.mdcTuitionPerCredit) },
    // Baccalaureate (B.S./B.A.S.) programs, same page, verified 2026-11-08.
    bachelorTuitionPerCredit: { inState: rate(129.89, S.mdcTuitionBachelor), outOfState: rate(535.97, S.mdcTuitionBachelor) },
  },
  school("valencia", "Valencia College", "Valencia", "FL", "Orlando", "community", 103, 391),
  school("broward", "Broward College", "Broward", "FL", "Fort Lauderdale", "community", 112, 399),
  school("acc", "Austin Community College", "ACC", "TX", "Austin", "community", 101, 399),
  school("hcc", "Houston Community College", "HCC", "TX", "Houston", "community", 98, 352),
  school("smc", "Santa Monica College", "SMC", "CA", "Santa Monica", "community", 46, 400),
  school("deanza", "De Anza College", "De Anza", "CA", "Cupertino", "community", 48, 380),
  school("bmcc", "Borough of Manhattan Community College (CUNY)", "BMCC", "NY", "New York", "community", 210, 320),
  school("nova", "Northern Virginia Community College", "NOVA", "VA", "Annandale", "community", 183, 397),
  school("ccc", "City Colleges of Chicago", "City Colleges", "IL", "Chicago", "community", 150, 452),
  school("mcc", "Mesa Community College (Maricopa)", "Mesa CC", "AZ", "Mesa", "community", 97, 401),
  school("ivytech", "Ivy Tech Community College", "Ivy Tech", "IN", "Indianapolis", "community", 168, 345),
  school("gsu-perimeter", "Perimeter College at Georgia State", "Perimeter", "GA", "Atlanta", "community", 115, 380),
  school("pcc", "Portland Community College", "PCC", "OR", "Portland", "community", 145, 315),
  school("seattle-central", "Seattle Central College", "Seattle Central", "WA", "Seattle", "community", 118, 300),
  school("ccd", "Community College of Denver", "CCD", "CO", "Denver", "community", 190, 590),
  school("cpcc", "Central Piedmont Community College", "CPCC", "NC", "Charlotte", "community", 80, 272),
  school("ccp", "Community College of Philadelphia", "CCP", "PA", "Philadelphia", "community", 200, 560),
  school("tri-c", "Cuyahoga Community College (Tri-C)", "Tri-C", "OH", "Cleveland", "community", 130, 330),
  school("bhcc", "Bunker Hill Community College", "Bunker Hill", "MA", "Boston", "community", 245, 515),

  // ── Public universities (transfer to, or start at) ──
  school("fiu", "Florida International University", "FIU", "FL", "Miami", "university", 206, 619),
  school("ucf", "University of Central Florida", "UCF", "FL", "Orlando", "university", 212, 749),
  school("uf", "University of Florida", "UF", "FL", "Gainesville", "university", 212, 955),
  school("ut-austin", "University of Texas at Austin", "UT Austin", "TX", "Austin", "university", 400, 1350),
  school("uh", "University of Houston", "UH", "TX", "Houston", "university", 375, 990),
  school("ucla", "University of California, Los Angeles", "UCLA", "CA", "Los Angeles", "university", 470, 1530),
  school("sjsu", "San José State University", "SJSU", "CA", "San José", "university", 265, 660),
  school("hunter", "Hunter College (CUNY)", "Hunter", "NY", "New York", "university", 305, 620),
  school("gmu", "George Mason University", "George Mason", "VA", "Fairfax", "university", 450, 1300),
  school("uic", "University of Illinois Chicago", "UIC", "IL", "Chicago", "university", 450, 1000),
  school("asu", "Arizona State University", "ASU", "AZ", "Tempe", "university", 430, 1100),
  school("iu", "Indiana University Bloomington", "IU", "IN", "Bloomington", "university", 330, 1300),
  school("gsu", "Georgia State University", "Georgia State", "GA", "Atlanta", "university", 300, 1000),
  school("psu-or", "Portland State University", "Portland State", "OR", "Portland", "university", 235, 655),
  school("uw", "University of Washington", "UW", "WA", "Seattle", "university", 400, 1350),
  school("cu-denver", "University of Colorado Denver", "CU Denver", "CO", "Denver", "university", 380, 1050),
  school("uncc", "UNC Charlotte", "UNC Charlotte", "NC", "Charlotte", "university", 225, 715),
  school("temple", "Temple University", "Temple", "PA", "Philadelphia", "university", 640, 1150),
  school("csu-oh", "Cleveland State University", "Cleveland State", "OH", "Cleveland", "university", 425, 690),
  school("umass-boston", "University of Massachusetts Boston", "UMass Boston", "MA", "Boston", "university", 590, 1310),
];

/** Used for colleges a student adds themselves ("my college isn't listed"). */
export const NATIONAL_AVERAGES: Record<School["kind"], { inState: number; outOfState: number }> = {
  community: { inState: 150, outOfState: 360 },
  university: { inState: 340, outOfState: 940 },
};

export const DEFAULT_SCHOOL_ID = "mdc";
export const DEFAULT_HOME_STATE: StateCode = "FL";

/** Each state's main need/merit aid program name, for friendlier wording. Others say "your state grant". */
export const STATE_AID: Partial<Record<StateCode, string>> = {
  FL: "Bright Futures",
  GA: "HOPE Scholarship",
  TN: "HOPE Scholarship",
  NY: "Excelsior Scholarship",
  CA: "Cal Grant",
  TX: "TEXAS Grant",
  WA: "Washington College Grant",
  OR: "Oregon Promise",
  IN: "Frank O'Bannon Grant",
  IL: "MAP Grant",
  VA: "VA Guaranteed Assistance Program",
  NC: "NC Promise",
  PA: "PA State Grant",
  OH: "Ohio College Opportunity Grant",
  MA: "MASSGrant",
  AZ: "Arizona Promise",
  CO: "Colorado Student Grant",
};
