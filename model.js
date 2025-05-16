// Import required packages
const { App } = require('@slack/bolt');
require('dotenv').config();

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const fetchRequiredFields = require('./fetchMandatoryFields');

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN,
    logLevel: 'debug'
});



app.event('app_mention', async ({ event, client, say }) => {
    try {
        const userId = event.user;

        await say({
            text: `Hi <@${userId}>! Click the button to open the ticket creation popup:`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Hi <@${userId}>! Click the button to open the ticket creation popup:`
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Open Ticket Creation Window",
                                emoji: true
                            },
                            action_id: "open_simple_modal"
                        }
                    ]
                }
            ],
            thread_ts: event.thread_ts || event.ts
        });

    } catch (error) {
        console.error('Error handling app_mention:', error);
    }
});


app.action('open_simple_modal', async ({ body, ack, client }) => {
    await ack();
    try {

        const modalView = {
            type: "modal",
            callback_id: "simple_input_modal",
            title: {
                type: "plain_text",
                text: "Create Ticket",
                emoji: true
            },
            submit: {
                type: "plain_text",
                text: "Submit",
                emoji: true
            },
            close: {
                type: "plain_text",
                text: "Close",
                emoji: true
            },
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*JirassicBot*: Write a prompt to create a ticket in simple English"
                    }
                },
                {
                    "type": "divider"
                },
                {
                    "type": "input",
                    "block_id": "ticket_prompt_block",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "ticket_prompt",
                        "multiline": true,
                        "placeholder": {
                            "type": "plain_text",
                            "text": "Example: create a high priority task, change button color, assign to Sarthak, label: shell_th"
                        }
                    },
                    "label": {
                        "type": "plain_text",
                        "text": "Your Ticket Request",
                        "emoji": true
                    }
                }
            ]
        };

        await client.views.open({
            trigger_id: body.trigger_id,
            view: modalView
        });
    } catch (error) {
        console.error('Error opening modal:', error);
    }
});


app.view('simple_input_modal', async ({ ack, body, view, client }) => {
    try {
        const userId = body.user.id;
        const ticketPrompt = view.state.values.ticket_prompt_block.ticket_prompt.value;
        
        const userInput =  await extractTicketDetailsWithGroq(ticketPrompt)

        console.log("PROJECT:", userInput.project, " ISSUE_TYPE","Task")
        console.log("TICKET PROMPT JJSON DETAIL", userInput)
        
        const missingFields = await checkMissingFields(userInput);

console.log("missingFieldssss", missingFields)


        if (missingFields.length > 0) {
            // If there are missing fields, show an error in the modal
            await ack({
                response_action: "update",
                view: {
                    type: "modal",
                    callback_id: "simple_input_modal",
                    title: {
                        type: "plain_text",
                        text: "Create Ticket",
                        emoji: true
                    },
                    submit: {
                        type: "plain_text",
                        text: "Submit",
                        emoji: true
                    },
                    close: {
                        type: "plain_text",
                        text: "Close",
                        emoji: true
                    },
                    blocks: [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": "*JirassicBot*: Write a prompt to create a ticket in simple English"
                            }
                        },
                        {
                            "type": "divider"
                        },
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `*JirassicBot*: ⚠️ Your prompt is missing these required fields: *${missingFields.join(', ')}*\n\nPlease include them in your prompt.`
                            }
                        },
                        {
                            "type": "divider"
                        },
                        {
                            "type": "input",
                            "block_id": "ticket_prompt_block",
                            "element": {
                                "type": "plain_text_input",
                                "action_id": "ticket_prompt",
                                "multiline": true,
                                "initial_value": ticketPrompt,
                                "placeholder": {
                                    "type": "plain_text",
                                    "text": "Example: create a high priority task, change button color, assign to Sarthak, label: shell_th"
                                }
                            },
                            "label": {
                                "type": "plain_text",
                                "text": "Your Ticket Request",
                                "emoji": true
                            }
                        }
                    ]
                }
            });
        } else {
            // // If all required fields are present, acknowledge and process
            // await ack();

            // // Process the ticket and send confirmation
            // await client.chat.postMessage({
            //     channel: userId,
            //     text: `I received your complete ticket request:\n\n${ticketPrompt}\n\nI'll process this ticket right away!`
            // });
        } 

    } catch (error) {
        console.error('Error processing modal submission:', error);
        await ack();
    }
});

///////////////////////////////////////////////


async function extractTicketDetailsWithGroq(message) {
    const prompt = `
    Extract ticket details from this message. Return valid JSON without extra text i just need json data without extra hi hello ad dont even ask Let me know if you need any further assistance!:
    summary, description, priority (Highest/High/Medium/Low/Lowest) , issue_type (Task/Bug/Story), and mainly project (PSV,CAP etc), assignee (automatic), and labels (array).and dont add anything else in you response just json should be there and non firld should be missing

    Message:
${message}
    `;

    const res = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2
    });

    const rawResponse = res.choices[0].message.content.trim();

    try {
        const jsonMatch = rawResponse.match(/{.*}/s);

        if (jsonMatch) {
            let jsonString = jsonMatch[0];

            jsonString = jsonString.replace(/^`|`$/g, '');

            const data = JSON.parse(jsonString);
            return data;
        } else {
            throw new Error('No JSON found in the response');
        }
    } catch (e) {
        console.error('Error parsing Groq response:', rawResponse);
        throw new Error('Failed to parse Groq response');
    }
}

///////////////////////////////////////////////

// Placeholder function to check for missing fields
// Replace this with your actual parsing logic
async function checkMissingFields(userInputJson) {
    const missingFields = [];

    console.log("userInputJson ",userInputJson)
    if(!userInputJson.project){
        missingFields.push("project")
    }
    if (!userInputJson.issue_type) {
        missingFields.push("issue_type")
    }
    console.log("missingFieldschecksinside", missingFields)

    if (missingFields.length >0) {
        return missingFields
    }

    console.log("hehehehhehehe")
    const mandatoryFields = await fetchRequiredFields()

    console.log("mandatoryFieldssss ",mandatoryFields );
    



    // // Example: Check for required fields
    // if (!prompt.toLowerCase().includes('priority')) {
    //     missingFields.push('priority');
    // }

    // if (!prompt.toLowerCase().includes('type')) {
    //     missingFields.push('type');
    // }

    // if (!prompt.toLowerCase().includes('assign') && !prompt.toLowerCase().includes('assignee')) {
    //     missingFields.push('assignee');
    // }

    // if (!prompt.toLowerCase().includes('label')) {
    //     missingFields.push('label');
    // }

    return missingFields;
}

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Slack Ticket Bot is running!');
})();