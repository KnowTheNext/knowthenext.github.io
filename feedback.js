// The support page's feedback form (about/index.html).
//
// It sends one PostHog "survey sent" event per report, straight to the
// capture API with fetch. No PostHog script is loaded, nothing is stored in
// the browser (no cookies, no localStorage) and nothing is sent until the
// visitor presses Send, so the page needs no cookie banner (ADR 2 in the app
// repo).
//
// Every PostHog setting lives here and only here. Issue #51 switches it from
// the dev project to the production one.
const POSTHOG = {
  host: "https://eu.i.posthog.com",
  // KnowTheNext tvOS Dev. A project key can only send events, never read
  // them, so it is safe in a public page.
  key: "phc_ym2S8ZKY6qSiabdM8tYdyUxHdcZDgxtaQAAkwzjzhSus",
  // The support feedback survey in that project, and the ids of its two
  // open-text questions (first: what happened, second: email).
  surveyId: "01a1d1f1-5c64-0000-9c9e-d64240e30cb4",
  questions: {
    whatHappened: "e304febc-b8d5-4be5-ac62-d071e791b3c4",
    email: "bf5240ad-9d88-4151-bae9-a772e4daf57f",
  },
};

const form = document.getElementById("feedback");
const status = document.getElementById("feedback-status");
const params = new URLSearchParams(location.search);

// The app's Support QR code adds these (AboutView.supportURL). Anything
// else in the link is ignored.
const versions = {
  app: (params.get("app") || "").slice(0, 40),
  tvos: (params.get("tvos") || "").slice(0, 40),
};
if (versions.app || versions.tvos) {
  document.getElementById("feedback-versions").textContent =
    "Sent with your report: KnowTheNext " + (versions.app || "?") + ", tvOS " + (versions.tvos || "?") + ".";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const whatHappened = form.elements["what-happened"].value.trim();
  const email = form.elements["email"].value.trim();
  if (!whatHappened) {
    form.elements["what-happened"].focus();
    return;
  }

  const button = form.querySelector("button");
  button.disabled = true;
  status.textContent = "Sending…";

  // A new random id for every report: reports are never tied together or
  // to a person.
  const id = crypto.randomUUID();
  const body = {
    api_key: POSTHOG.key,
    event: "survey sent",
    distinct_id: id,
    properties: {
      $survey_id: POSTHOG.surveyId,
      $survey_submission_id: id,
      $survey_completed: true,
      $survey_questions: [
        { id: POSTHOG.questions.whatHappened, question: "What happened?" },
        { id: POSTHOG.questions.email, question: "Email for a reply (optional)" },
      ],
      ["$survey_response_" + POSTHOG.questions.whatHappened]: whatHappened,
      ["$survey_response_" + POSTHOG.questions.email]: email,
      app_version: versions.app || null,
      tvos_version: versions.tvos || null,
      $process_person_profile: false,
      $geoip_disable: true,
    },
  };

  try {
    const response = await fetch(POSTHOG.host + "/i/v0/e/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    form.reset();
    status.textContent = "Thanks, your report was sent." + (email ? " We'll reply by email." : "");
  } catch {
    status.textContent = "Your report could not be sent. Please try again, or email us instead.";
  } finally {
    button.disabled = false;
  }
});
