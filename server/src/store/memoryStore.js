import { seedHousehold, DEMO_HOUSEHOLD_ID } from "../data/seedHousehold.js";

let state = structuredClone(seedHousehold);

export function resetMemoryStore() {
  state = structuredClone(seedHousehold);
  return state;
}

export function getMemoryHousehold(id = DEMO_HOUSEHOLD_ID) {
  if (id !== DEMO_HOUSEHOLD_ID) return null;
  return state;
}

export function setMemoryHousehold(next) {
  state = next;
  return state;
}
