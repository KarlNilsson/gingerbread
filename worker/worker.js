// Cloudflare Worker: reads the Microsoft Forms "summary link" data feed and
// returns question 1's options + vote counts as JSON with CORS headers.
// It only ever calls the two fixed URLs below, so it is not an open proxy.
//
// NOTE: these are undocumented endpoints used by the Forms summary page.
// Microsoft may change them without notice.

const ORG_ID = "8b12f282-f648-4fe1-ad67-d10c7fbf40a0";
const OWNER_ID = "3fbe1a31-359a-4d70-a435-dfad4f1c5b9b";
const FORM_ID =
  "gvISi0j24U-tZ9EMf79AoDEavj-aNXBNpDXfrU8cW5tUNVc2TjNENThQTlY1NVdXUTNaVFhCS0czSi4u";
const ANALYZER_TOKEN = "hIWejZZfst2djPmglhlLfQNyo3ke90rx";

const BASE = `https://forms.cloud.microsoft/formapi/api/${ORG_ID}/users/${OWNER_ID}`;
const FORM_URL = `${BASE}/light/analysisForms('${FORM_ID}')?$expand=questions($expand=choices)`;
const AGG_URL = `${BASE}/analysisForms('${FORM_ID}')/GetAggregateSurveyData`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
};

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", AnalyzerToken: ANALYZER_TOKEN },
  });
  if (!res.ok) throw new Error(`Forms API ${res.status} for ${url}`);
  return res.json();
}

export async function getSummary() {
  const [form, agg] = await Promise.all([getJson(FORM_URL), getJson(AGG_URL)]);

  // Question 1 = the first question by order.
  const q = [...form.questions].sort((a, b) => a.order - b.order)[0];
  const choices = JSON.parse(q.questionInfo || "{}").Choices || [];

  const col = agg.value.find((v) => v.columnPropertyName === q.id) || {};
  const counts = new Map(
    [...(col.formChoiceData || []), ...(col.choiceData || [])].map((c) => [c.id, c.count])
  );

  const options = choices.map((c) => ({
    label: c.Description,
    count: counts.get(c.Description) || 0,
  }));
  // Include any answers not in the choice list (e.g. "Other" free text).
  for (const [label, count] of counts) {
    if (!options.some((o) => o.label === label)) options.push({ label, count });
  }

  const summary = agg.value.find((v) => v.aggregationDataType === "summaryData");
  return {
    title: form.title,
    question: q.title,
    totalResponses: summary?.summaryData?.count ?? form.rowCount ?? 0,
    options,
    updatedAt: new Date().toISOString(),
  };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    try {
      const data = await getSummary();
      return new Response(JSON.stringify(data), {
        headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err.message || err) }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
      });
    }
  },
};
