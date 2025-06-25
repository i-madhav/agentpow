import { openai } from "./fine.js";

async function checkJobStatus(jobId) {
  try {
    const job = await openai.fineTuning.jobs.retrieve(jobId);
    console.log("📊 Job status:", job.status);
    console.log(job)
    console.log("📄 Fine-tuned model name:", job.fine_tuned_model || "Not ready yet");
  } catch (error) {
    console.error("❌ Failed to retrieve job:", error.message);
  }
}

checkJobStatus("ftjob-5Vbcl5feDI6HfdHlYEXxSuyK");