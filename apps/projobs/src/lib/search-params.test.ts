import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, activeFilterCount, filtersToParams, parseFilters, toApiQuery } from "./search-params";

describe("search params", () => {
  it("round-trips filters through the URL and drops defaults", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      q: " react ",
      workplace: ["remote", "hybrid"] as const,
      skills: ["typescript"],
      salaryMin: 5000,
      postedWithin: 7,
      sort: "recent" as const,
      page: 2,
    };
    const params = filtersToParams({ ...filters, workplace: [...filters.workplace] });
    expect(params.toString()).toBe("q=react&workplace=remote%2Chybrid&skills=typescript&salary=5000&posted=7&sort=recent&page=2");
    expect(parseFilters(params)).toEqual({ ...filters, q: "react", workplace: ["remote", "hybrid"] });
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe("");
  });

  it("ignores unknown or malicious values", () => {
    const parsed = parseFilters(new URLSearchParams("workplace=moon,remote&sort=drop&page=-3&posted=5&salary=abc&seniority=senior,senior"));
    expect(parsed.workplace).toEqual(["remote"]);
    expect(parsed.sort).toBe("relevance");
    expect(parsed.page).toBe(1);
    expect(parsed.postedWithin).toBeNull();
    expect(parsed.salaryMin).toBeNull();
    expect(parsed.seniority).toEqual(["senior"]);
  });

  it("builds the API query and only ranks by match when skills are known", () => {
    const filters = { ...DEFAULT_FILTERS, sort: "match" as const, type: ["contract" as const] };
    expect(toApiQuery(filters, [])).toBe("type=contract&sort=relevance&page=1&pageSize=20");
    expect(toApiQuery(filters, ["react", "sql"], 10)).toBe("type=contract&mySkills=react%2Csql&sort=match&page=1&pageSize=10");
    expect(activeFilterCount({ ...filters, skills: ["go"], location: "Lima" })).toBe(3);
  });
});
