import { App, LogLevel } from "@slack/bolt";
import dotenv from "dotenv";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


dotenv.config();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  logLevel: LogLevel.INFO,
  socketMode: false,
  port: Number(process.env.PORT) || 3000,
});

async function summarizeMessages(messages: any[]): Promise<string> {
  const threadContent = messages
    .map((msg) => `${msg.user || "unknown"}: ${msg.text}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Summarize the following Slack thread clearly and concisely.",
      },
      {
        role: "user",
        content: threadContent,
      },
    ],
  });

  return response.choices[0].message?.content || "Couldn't summarize.";
}


slackApp.event("app_mention", async ({ event, client, say }) => {
  const thread_ts = (event as any).thread_ts;
  const channel = event.channel;

  if (!thread_ts) {
    await say("Please mention me *in a thread* to summarize it.");
    return;
  }

  const result = await client.conversations.replies({
    channel,
    ts: thread_ts,
  });

  const messages = result.messages || [];
  const summary = await summarizeMessages(messages);

  await say({
    text: `📝 *Thread Summary:*\n${summary}`,
    thread_ts,
  });
});

(async () => {
  await slackApp.start();
  console.log("⚡️ Slack summarizer bot running on port", process.env.PORT);
})();
