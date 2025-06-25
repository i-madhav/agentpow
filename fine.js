import OpenAI from "openai";
import fs from "fs";
import path from "path";

export const openai = new OpenAI({
    apiKey:process.env.OPENAI_API_KEY,
});

const jsonlPath = path.join(process.cwd(), "fine_tune_dataset.jsonl");
//const conversation = fs.readFileSync(jsonlPath);

// Build data in the required Chat-Completion format
// const jsonlData = conversationLog.map(log => ({
//     messages: [
//         { role: "system", content: `User feedback: ${log.user_feedback}. Improvement suggestion: ${log.improvement_suggestion}` },
//         { role: "user", content: log.user_query },
//         { role: "assistant", content: log.assistant_response }
//     ]
// }));

// Write each JSON object on a separate line
//const jsonlContent = jsonlData.map(JSON.stringify).join('\n');

//fs.writeFileSync(jsonlPath, conversation, "utf8");

console.log("✅ Created dataset:", jsonlPath);

// Step 2: Upload training file
async function uploadAndFineTune() {
    try {
        const uploadedFile = await openai.files.create({
            file: fs.createReadStream(jsonlPath),
            purpose: "fine-tune"
        });

        console.log("✅ Uploaded file ID:", uploadedFile.id);

        // Step 3: Create fine-tuning job
        const fineTuneJob = await openai.fineTuning.jobs.create({
            training_file: uploadedFile.id,
            model: "gpt-3.5-turbo-1106"
        });

        console.log("🚀 Fine-tuning started. Job ID:", fineTuneJob.id);
    } catch (err) {
        console.error("❌ Error:", err);
    }
}

uploadAndFineTune();
