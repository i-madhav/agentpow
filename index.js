import 'dotenv/config';
import axios from 'axios';

const broker = {
    id: "broker123",
    name: "John Realty",
    prompt: `You are a helpful, knowledgeable, and professional real estate assistant.

    - You specialize in properties across japan and nearby regions.
    - You should greet users politely and maintain a professional tone.
    - Always summarize property features in bullet points.
    - Include pricing, furnishing status, and location proximity if asked.
    - If you don't have enough data, clearly say so and ask for clarification.
    - Keep answers concise, friendly, and avoid unnecessary filler.`,
};

const userEmail = "client@example.com";
const emailContent = `3. 
name
Sokunthy LY
email
ly.sokunthy@num.edu.kh
phone_number
+85581882122
message
Hello! I'm interested in purchasing a property in Tokyo for Airbnb rental purposes. My budget is quite limited, so I would appreciate it if you could suggest the most affordable options that are suitable for short-term rental use (with the proper licensing or potential for approval). Thank you.
country
label: Cambodia
value: Cambodia`;

async function callHandleEmailFunction() {
    try {
        const response = await axios.post(process.env.GCP_FUNCTION_URL, {
            broker,
            userEmail,
            emailContent
        });
        
        console.log("This is aiReply");
        console.log(response.data.reply);

    } catch (error) {
        console.error("Error calling GCP function:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
            console.error("Status:", error.response.status);
        }
    }
}

if (!process.env.GCP_FUNCTION_URL) {
    console.error("Please set the GCP_FUNCTION_URL in your .env file.");
} else {
    callHandleEmailFunction();
}