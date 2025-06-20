import { OpenAI } from "openai";
import { Storage } from "@google-cloud/storage";

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Cloud Storage client
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;
const dbFileName = process.env.DB_FILE_NAME || 'db.json';
const bucket = storage.bucket(bucketName);
const dbFile = bucket.file(dbFileName);

async function getDb() {
    try {
        const data = await dbFile.download();
        return JSON.parse(data[0].toString());
    } catch (error) {
        if (error.code === 404) {
            // If the file doesn't exist, return a default structure
            return { threadStore: {}, assistantStore: {} };
        }
        throw error;
    }
}

async function saveDb(data) {
    await dbFile.save(JSON.stringify(data, null, 2));
}

async function getOrCreateAssistant(brokerName, brokerPrompt, db) {
    if (db.assistantStore[brokerName]) {
        return db.assistantStore[brokerName];
    }

    const assistant = await openai.beta.assistants.create({
        name: `Broker AI - ${brokerName}`,
        instructions: brokerPrompt,
        model: "gpt-4o",
    });

    db.assistantStore[brokerName] = assistant.id;
    await saveDb(db);
    return assistant.id;
}

async function handleIncomingEmail({ broker, userEmail, emailContent, db }) {
    let threadId = db.threadStore[`${broker.id}_${userEmail}`];
    let isNewThread = false;
    if (!threadId) {
        const thread = await openai.beta.threads.create();
        threadId = thread.id;
        db.threadStore[`${broker.id}_${userEmail}`] = threadId;
        isNewThread = true;
    }

    await openai.beta.threads.messages.create(threadId, {
        role: "user",
        content: emailContent,
    });

    const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: broker.assistant_id,
    });

    let runStatus;
    do {
        await new Promise((r) => setTimeout(r, 2000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: threadId });
    } while (runStatus.status === "in_progress" || runStatus.status === "queued");

    if (runStatus.status !== "completed") {
        console.error("Run failed with status:", runStatus.status);
        // You might want to inspect runStatus.last_error here
        return "Sorry, I encountered an error while processing your request.";
    }


    const messages = await openai.beta.threads.messages.list(threadId);

    const reply = messages.data.find(m => m.role === "assistant")?.content?.[0]?.text?.value;
    
    if (isNewThread) {
        await saveDb(db);
    }

    return reply || "Sorry, I couldn't generate a reply.";
}

export async function handleEmail(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { broker: brokerData, userEmail, emailContent } = req.body;

    if (!brokerData || !userEmail || !emailContent) {
        return res.status(400).send('Missing required fields: broker, userEmail, emailContent');
    }

    try {
        const db = await getDb();
        
        const broker = { ...brokerData };
        broker.assistant_id = await getOrCreateAssistant(broker.name, broker.prompt, db);

        const aiReply = await handleIncomingEmail({ broker, userEmail, emailContent, db });

        res.status(200).send({ reply: aiReply });
    } catch (error) {
        console.error("Error processing email:", error);
        res.status(500).send("Internal Server Error");
    }
} 