import { OpenAI } from "openai";
import readline from "node:readline";
import path from "path";
import fs from "fs";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY,
});

async function handleIncomingEmail({ broker, emailContent }) {
    let threadId = "thread_U1PYY6NdUw6k8x2mmQmcz14i";

    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: emailContent,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: broker.assistant_id
    });

    let runStatus;
    do {
        await new Promise((r) => setTimeout(r, 2000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, {
            thread_id: threadId
        });
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(threadId);
    const reply = messages.data.find((m) => m.role === "assistant")?.content?.[0]?.text?.value;

    return reply || "Sorry, I couldn't generate a reply.";
}

function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) =>
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        })
    );
}

async function correlationLog(user_query, assistant_response) {
    console.log("\n=== AI RESPONSE CORRELATION ===");
    console.log("🧠 User Query:\n", user_query);
    console.log("\n🤖 Assistant Response:\n", assistant_response);

    const user_feedback = await prompt("\nHow was the reply? (positive/neutral/negative): ");
    const improvement_suggestion = await prompt("Any improvement suggestion? ");

    const logEntry = {
        user_query,
        assistant_response,
        user_feedback,
        improvement_suggestion,
    };

    console.log("\n✅ Collected Feedback:");
    console.log(logEntry);

    // Append as JSONL
    const jsonlPath = path.join(process.cwd(), "fine_tune_dataset.jsonl");

    const jsonlData = {
        messages: [
            { role: "system", content: `User feedback: ${logEntry.user_feedback}. Improvement suggestion: ${logEntry.improvement_suggestion}` },
            { role: "user", content: logEntry.user_query },
            { role: "assistant", content: logEntry.assistant_response }
        ]
    }

    fs.appendFileSync(
        jsonlPath,
        JSON.stringify(jsonlData) + "\n",
        "utf8"
    );
}

(async () => {
    const broker = {
        id: "broker123",
        name: "John Realty",
        prompt: `You are a helpful, knowledgeable, and professional real estate assistant.
- You specialize in properties across Japan and nearby regions.
- You should greet users politely and maintain a professional tone.
- Include pricing, furnishing status, and location proximity if asked otherwise no need to give information.
- If you don't have enough data, clearly say so and ask for clarification.
- Do not divert from the topic.
- Keep answers concise, friendly, and avoid unnecessary filler.
- IMPORTANT: IF USER ASKS TO SHOW PROPERTY OR WANTS TO KNOW ABOUT PROPERTY, AND YOU DO NOT HAVE DATA, JUST TELL THE USER YOU WILL CONNECT THEM TO A SUITABLE AGENT.`,
    };

    broker.assistant_id = "asst_iYlJABXGOTZmPcEcaS7wEltZ";

    const userEmail = "client@example.com";
    const emailContent = `name: Sokunthy LY
email: ly.sokunthy@num.edu.kh
phone_number: +85581882122
message: do you have couple room `;

    const aiReply = await handleIncomingEmail({ broker, userEmail, emailContent });

    await correlationLog(emailContent, aiReply);
})();