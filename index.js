require('dotenv').config();

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


// async function extractTicketDetailsWithGroq(message) {
//     const prompt = `
//     Extract ticket details from this message. Return valid JSON without extra text i just need json data without extra hi hello ad dont even ask Let me know if you need any further assistance!:
//     summary, description, priority (Highest/High/Medium/Low/Lowest) , issue_type (Task/Bug/Story), assignee (automatic), and labels (array).and dont add anything else in you response just json should be there and non firld should be missing

//     Message:
//     create a ticket where priority is very high and you have to change color of the button and assign it to sarthak jain where ticket type is task and and label is shell_th
//     `;

//     const res = await groq.chat.completions.create({
//         model: 'llama3-8b-8192',
//         messages: [{ role: 'user', content: prompt }],
//         temperature: 0.2
//     });

//     const rawResponse = res.choices[0].message.content.trim();

//     try {
//         const jsonMatch = rawResponse.match(/{.*}/s);

//         if (jsonMatch) {
//             let jsonString = jsonMatch[0];

//             jsonString = jsonString.replace(/^`|`$/g, '');

//             const data = JSON.parse(jsonString);
//             return data;
//         } else {
//             throw new Error('No JSON found in the response');
//         }
//     } catch (e) {
//         console.error('Error parsing Groq response:', rawResponse);
//         throw new Error('Failed to parse Groq response');
//     }
// }

function extractTicketDetailsWithGroq(message) {
    return new Promise((resolve, reject) => {
        // Directly simulate the ticket details for testing
        const simulatedTicketDetails = {
            summary: 'Create a ticket',
            description: 'This is a test description',
            priority: 'High',
            issue_type: 'Task',
            assignee: '5f8d1234567890abcdef1234', // ✅ Actual Jira accountId, not name or email
            labels: ['shell_th'],
            components: [{ id: '10001' }], // ✅ Must use existing component ID, not name
          
            // These custom fields expect arrays of objects
            brand: [{ value: 'Shell' }],        // ✅ Brand in array
            environment: [{ value: 'Test' }], // ✅ Environment in array
            geoRegion: { value: 'INDIA' },           // ✅ GeoRegion must match allowed values
            goLiveDate: { name: '2025-05-15' },     // ✅ Expected Go-Live Date as object
          };

        console.log('Simulated Ticket Details:', simulatedTicketDetails);
        resolve(simulatedTicketDetails); // Resolve with the ticket details
    });
}

extractTicketDetailsWithGroq('create a ticket where priority is high and you have to change color of the button and assign it to sarthak jain where ticket type is task and label is shell_th')
    .then((ticketDetails) => {
        createJiraTicket(ticketDetails)
        console.log('Ticket Details:', ticketDetails);
    })
    .catch((error) => {
        console.error('Error aa gya:', error);
    });



const axios = require('axios');

function createJiraTicket(ticketDetails) {
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
                key: 'CAP',
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
                                text: ticketDetails.description,
                                type: "text"
                            }
                        ]
                    }
                ]
            },
            priority: {
                id: getPriorityId(ticketDetails.priority)
            },
            issuetype: {
                name: ticketDetails.issue_type,
            },
            labels: ticketDetails.labels,
        },
    };

    // Make the request to create the Jira ticket
    axios
        .post(jiraUrl, payload, auth)
        .then((response) => {
            console.log('Jira Ticket Created Successfully:', response.data);
        })
        .catch((error) => {
            console.error('Error creating Jira ticket:', error.response ? error.response.data : error.message);
        });
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