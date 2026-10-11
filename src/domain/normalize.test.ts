import { describe, expect, it } from "vitest";
import { companyKey, findTargetRole, isSameCompany, profileKey } from "./normalize";

describe("profileKey", () => {
  it.each([
    "http://linkedin.com/in/marcusbell",
    "https://uk.linkedin.com/in/marcusbell/",
    "https://www.linkedin.com/in/MarcusBell?trk=feed#about",
    "  www.linkedin.com/in/marcusbell//  ",
  ])("reads %s as the same profile as its canonical URL", (variant) => {
    expect(profileKey(variant)).toBe(profileKey("https://www.linkedin.com/in/marcusbell"));
  });

  it("keeps different profiles apart", () => {
    expect(profileKey("https://www.linkedin.com/in/james-lee-a1")).not.toBe(
      profileKey("https://www.linkedin.com/in/jameslee-recruit"),
    );
  });
});

describe("companyKey", () => {
  it("ignores case, punctuation and legal suffixes", () => {
    expect(isSameCompany("Northgate Surveyors Ltd", "Northgate Surveyors")).toBe(true);
    expect(isSameCompany("NORTHGATE  SURVEYORS LIMITED.", "Northgate Surveyors")).toBe(true);
  });

  it("does not merge a company with a longer name that starts the same", () => {
    expect(isSameCompany("Northgate Surveyors Scotland", "Northgate Surveyors")).toBe(false);
  });

  it("never matches a missing company", () => {
    expect(isSameCompany(null, null)).toBe(false);
    expect(isSameCompany("", "")).toBe(false);
  });

  it("keeps a name that is only a legal word", () => {
    expect(companyKey("Limited")).toBe("limited");
  });
});

describe("findTargetRole", () => {
  const roles = ["Managing Director", "CFO", "COO"];

  it("ignores case", () => {
    expect(findTargetRole("Managing director at Gomez Construction Ltd", roles)).toBe(
      "Managing Director",
    );
  });

  it("matches a role next to punctuation", () => {
    expect(findTargetRole("CFO, Larkspur Hotels", roles)).toBe("CFO");
    expect(findTargetRole("Founder/COO", roles)).toBe("COO");
  });

  it("does not find a short role inside a longer word", () => {
    expect(findTargetRole("Project Coordinator at Acme", roles)).toBeNull();
    expect(findTargetRole("Cook", roles)).toBeNull();
  });

  it("returns null without a headline", () => {
    expect(findTargetRole(null, roles)).toBeNull();
    expect(findTargetRole("", roles)).toBeNull();
  });
});
