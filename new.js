// Import required packages
const { App } = require('@slack/bolt');
require('dotenv').config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

// Handle mentions of the bot
app.event('app_mention', async ({ event, client, say }) => {
    try {
        console.log("Received app_mention event:", event);
        const userId = event.user;

        // Reply to the mention - we can't open a modal directly from an app_mention
        await say({
            text: `Hi <@${userId}>! Click the button to open the popup:`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `Hi <@${userId}>! Click the button to open the popup:`
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Open Popup",
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

// Handle the button click to open the modal
app.action('open_simple_modal', async ({ body, ack, client }) => {
    await ack();
    try {
        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: "modal",
                callback_id: "simple_input_modal",
                title: {
                    type: "plain_text",
                    text: "Simple Input",
                    emoji: true
                },
                submit: {
                    type: "plain_text",
                    text: "OK",
                    emoji: true
                },
                close: {
                    type: "plain_text",
                    text: "Close",
                    emoji: true
                },
                blocks: [
                    {
                        "type": "input",
                        "block_id": "input_block",
                        "element": {
                            "type": "plain_text_input",
                            "action_id": "input_value",
                            "placeholder": {
                                "type": "plain_text",
                                "text": "Enter some text..."
                            }
                        },
                        "label": {
                            "type": "plain_text",
                            "text": "Input",
                            "emoji": true
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Error opening modal:', error);
    }
});

// Handle the modal submission
app.view('simple_input_modal', async ({ ack, body, view, client }) => {
    await ack();

    try {
        // Get the input value from the modal
        const inputValue = view.state.values.input_block.input_value.value;

        // Get the user who submitted the form
        const userId = body.user.id;

        console.log(`User ${userId} submitted: ${inputValue}`);

        // Send a confirmation message to the user via DM
        await client.chat.postMessage({
            channel: userId,
            text: `You submitted: ${inputValue}`
        });

    } catch (error) {
        console.error('Error processing modal submission:', error);
    }
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Slack Ticket Bot is running!');
})();