const functions = require("@google-cloud/functions-framework");

// Cloud Function (2nd gen), triggered by the "monitoring-alerts" Pub/Sub topic.
// Cloud Monitoring publishes an alert incident to that topic; this function turns
// the incident into a readable Discord message and posts it via an incoming
// webhook. The webhook URL is injected at deploy time (DISCORD_WEBHOOK_URL) so it
// never lives in the repo.
//
// This is the fan-out leg of the pipeline: alert policy -> Pub/Sub -> this
// function -> Discord. Pub/Sub decouples the alert source from the delivery code,
// the same way SNS sits in front of a Lambda on AWS.
functions.cloudEvent("alertToDiscord", async (cloudEvent) => {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    console.error("DISCORD_WEBHOOK_URL is not set; cannot post.");
    return;
  }

  // A Pub/Sub message carries its payload as base64 in data.message.data.
  const base64 = cloudEvent.data?.message?.data;
  const raw = base64 ? Buffer.from(base64, "base64").toString("utf8") : "{}";
  let incident = {};
  try {
    incident = JSON.parse(raw).incident ?? {};
  } catch (err) {
    console.error("Could not parse incident JSON:", err);
  }

  // "open" means a condition is currently failing; anything else (e.g. "closed")
  // means it has recovered. Colour and wording follow that.
  const isOpen = incident.state === "open";
  const embed = {
    title: `${isOpen ? "🔴 DOWN" : "🟢 RECOVERED"} — ${incident.policy_name ?? "alert"}`.slice(0, 256),
    description: (incident.summary ?? "No summary provided.").slice(0, 4096),
    url: incident.url || undefined,
    color: isOpen ? 0xe74c3c : 0x2ecc71,
    fields: [
      incident.condition_name && { name: "Condition", value: String(incident.condition_name), inline: true },
      incident.resource_name && { name: "Resource", value: String(incident.resource_name), inline: true },
    ].filter(Boolean),
    timestamp: new Date().toISOString(),
    footer: { text: `incident ${incident.incident_id ?? "unknown"}` },
  };

  // Node 22 has a global fetch, so no HTTP client dependency is needed.
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    const body = await res.text();
    // Retries are disabled on this trigger (RETRY_POLICY_DO_NOT_RETRY), so a
    // failed post is dropped, not redelivered — which is what we want for alerts
    // (no duplicate Discord messages). Throwing just records the error in logs.
    throw new Error(`Discord webhook returned ${res.status}: ${body}`);
  }
  console.log(`Posted to Discord: ${embed.title}`);
});
