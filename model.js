// Import required packages
const { App } = require('@slack/bolt');
require('dotenv').config();

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const fetchRequiredFields = require('./fetchMandatoryFields');
const fetchSpecificCustomFields = require('./fetchspecificDetails.js')
const axios = require('axios')

// const fetchSpecificCustomFields = require('./fetchspecificDetails.js')

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
        // Add this for debugging
        console.log('ACTION BODY:', JSON.stringify(body, null, 2));

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

        // Robust extraction for channel and thread_ts
        const channel =
            body.channel?.id ||
            body.channel_id ||
            body.message?.channel ||
            (body.container && body.container.channel_id);

        const thread_ts =
            body.message?.thread_ts ||
            body.message?.ts ||
            body.message_ts ||
            (body.container && body.container.thread_ts);

        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                ...modalView,
                private_metadata: JSON.stringify({
                    channel: channel,
                    thread_ts: thread_ts
                })
            }
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
        
        console.log("userInputttt", userInput)
        const missingFields = await checkMissingFields(userInput);


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
            // If all required fields are present, acknowledge and process
            await ack();

            // Process the ticket and send confirmation
            const response =  await createJiraTicket(userInput);
            console.log("respseinf", response);
            const ticketNo = response?.data?.key;
            const ticketUrl = `https://capillarytech.atlassian.net/browse/${ticketNo}`;
            // Extract channel and thread_ts from private_metadata
            const metadata = JSON.parse(view.private_metadata || '{}');
            const channel = metadata.channel;
            const thread_ts = metadata.thread_ts;

            if (typeof channel === 'string' && channel.trim().length > 0) {
                await client.chat.postMessage({
                    channel: channel,
                    text: `Hi <@${userId}>! Click the link to open the ticket: ${ticketUrl}`,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `Hi <@${userId}>! Click the link to open the ticket: ${ticketUrl}`
                            }
                        }
                    ],
                    ...(thread_ts ? { thread_ts } : {})
                });
            } else {
                console.error('No valid channel found in private_metadata, sending confirmation as DM to user. Channel value:', channel);
                await client.chat.postMessage({
                    channel: userId,
                    text: `Hi <@${userId}>! Click the link to open the ticket: ${ticketUrl}`,
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `Hi <@${userId}>! Click the link to open the ticket: ${ticketUrl}`
                            }
                        }
                    ]
                });
            }
        } 

    } catch (error) {
        console.error('Error processing modal submission:', error);
        await ack();
    }
});




async function extractTicketDetailsWithGroq(message) {

    const prompt = `
    Extract ticket details from the following message. Return a valid JSON object **only** with the fields that are explicitly mentioned or intelligently inferred from the message. Do not include any fields that are not explicitly mentioned or inferred.

    The following fields should be extracted (if present or inferred):
    - **summary**: The main task or issue. This could be inferred from actions like "change button color," "update text," etc rephrase the summary in technical language and.
    - **description**: Any additional context or details related to the task. If not provided use summary and form a description of atleast 15 words in technical language and don't use other fields in description
    - **priority**: If mentioned, return priority as "Highest", "High", "Medium", "Low", or "Lowest".
    - **issuetype**: If explicitly mentioned, return the type of issue (e.g., bug, feature request).
    - **project**: If mentioned, return the project name or inferred based on keywords it will have values like CAP, PSV, CJ.
    - **assignee**: If the task is assigned to someone (e.g., "assign to Sarthak"), return the assignee's name.
    - **labels**: If mentioned, return labels as an array (e.g., ["shell_th"]).
    
    In addition to these, **other fields** might be present in the message, such as:
    - **due_date**: Inferred if mentioned in phrases like "by tomorrow," "ASAP," "end of the week," etc.
    - **severity**: Can be inferred from words like "critical," "urgent," etc.
    - **tags**: If tags or keywords are mentioned (e.g., "tag: important"), include them as an array.
    - **due_time**: If specific time is mentioned (e.g., "by 5 PM," "in 2 hours").
    - **customfield_11997**: this is the brand or organisation for which ticket is raised.
    - **components**: If mentioned, return the components or inferred based on keywords it will have value like API, alerts, Backend-CRM infer it as a string.
    - **customfield_11800**: If mentioned, return the environment or inferred based on keywords it is a enum with values like Prod, UAT, Nightly, Staging, Demo, Go-Live.

    If any of these fields are not mentioned or are unclear from the message, **do not include them** in the output. Focus on **smartly inferring** fields that are clearly implied by the context of the message, but skip irrelevant or undefined fields.

    Message:
    ${message}
    `;


    const res = await groq.chat.completions.create({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0
    });

    const rawResponse = res.choices[0].message.content.trim();
    console.log("rawResponseeee", rawResponse)

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


async function createJiraTicket(ticketDetails) {
    const jiraUrl = 'https://capillarytech.atlassian.net/rest/api/3/issue'; // Replace with your Jira domain
    const username = 'gourav.hanumante@capillarytech.com'; // Replace with your Jira email
    const apiToken = process.env.JIRA_API_KEY; // Replace with your Jira API token

    // Prepare the authorization header using basic auth
    const auth = {
        auth: {
            username: username,
            password: apiToken,
        },
        headers: {
            'Content-Type': 'application/json',
        },
    };
    console.log('Priority value being sent:', ticketDetails.priority);
    // Prepare the payload with the ticket details
    
    const payload = {
        fields: {
            project: {
                key: ticketDetails.project,
            },
            summary: ticketDetails.summary,
            description: {
                type: "doc",
                version: 1,
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {
                                type: "text",
                                text: ticketDetails.description ?? '',
                            
                            }
                        ]
                    }
                ]
            },
            priority: {
                id: getPriorityId(ticketDetails.priority)
            },
            issuetype: {
                name: ticketDetails.issuetype,
            },
            labels: ticketDetails.labels,
            customfield_11997: [
                {
                    "value": ticketDetails.customfield_11997
                }
            ],
            components: [
                {
                    "name": ticketDetails.components
                }
            ],
            customfield_11800: [
                {
                    "value" : ticketDetails.customfield_11800
                }
            ],
        },
    };

    console.log('payload-------', JSON.stringify(payload));

    // Make the request to create the Jira ticket
    const response =  await axios.post(jiraUrl, payload, auth)
    return response;
    console.log("response", response);
        
    
}


function getPriorityId(priorityName) {
    const priorities = {
        "Highest": "1",
        "High": "2", 
        "Medium": "3",
        "Low": "4",
        "Lowest": "5"
    };
    return priorities[priorityName] || "3"; // Default to Medium
}



async function checkMissingFields(userInputJson) {
    const missingFields = [];

    console.log("userInputJson ",userInputJson)
    if(!userInputJson.project){
        missingFields.push("project")
    }
    if (!userInputJson.issuetype) {
        missingFields.push("issuetype")
    }

    console.log("missingFieldsmainnnnnnn", missingFields);
    
    if (missingFields.length >0) {
        return missingFields
    }

    const requiredFields = await fetchRequiredFields(userInputJson.project, userInputJson.issuetype.capitalizeFirstLetter());
    const missingFieldData = await fetchSpecificCustomFields(requiredFields);

    console.log("requiredFieldsssss ", requiredFields)
  
    requiredFields.forEach(field => {
      if (!userInputJson[field]) {
        missingFields.push(missingFieldData[field].name);
      }
    });

    return missingFields;
}

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Slack Ticket Bot is running!');
})();



String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };