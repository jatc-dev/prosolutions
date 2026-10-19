/* global URLSearchParams */
import test from "node:test";
import assert from "node:assert/strict";
import { applyJobsQuery, clearJobsQuery, parseJobsQuery } from "./searchParams.mjs";

test("parses shared URL filters into the controlled query model", () => {
  const query = parseJobsQuery(new URLSearchParams(
    "q=React%20Senior&tech=TypeScript&modality=remote&seniority=senior",
  ));

  assert.deepEqual(query, {
    text: "React Senior",
    technology: "TypeScript",
    modality: "remote",
    seniority: "senior",
  });
});

test("updates filters, trims values, and preserves unrelated query parameters", () => {
  const result = applyJobsQuery(
    new URLSearchParams("campaign=october&q=old&tech=Java&keep=1"),
    { text: "  React  ", technology: "", modality: " remote ", seniority: "senior" },
  );

  assert.equal(result.get("campaign"), "october");
  assert.equal(result.get("keep"), "1");
  assert.equal(result.get("q"), "React");
  assert.equal(result.has("tech"), false);
  assert.equal(result.get("modality"), "remote");
  assert.equal(result.get("seniority"), "senior");
});

test("clears only ProJobs filters and keeps other URL state", () => {
  const result = clearJobsQuery(
    new URLSearchParams("campaign=october&q=React&tech=TypeScript&modality=remote&seniority=senior&view=compact"),
  );

  assert.equal(result.toString(), "campaign=october&view=compact");
});

test("returns empty strings for filters absent from a shared URL", () => {
  assert.deepEqual(parseJobsQuery(new URLSearchParams("campaign=october")), {
    text: "",
    technology: "",
    modality: "",
    seniority: "",
  });
});
