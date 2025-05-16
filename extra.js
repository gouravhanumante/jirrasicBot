
// // Handle the ticket submission from the modal
// app.view('create_jira_ticket', async ({ ack, body, view, client }) => {
//   // Get the ticket description from the form
//   const ticketDescription = view.state.values.ticket_description_block.ticket_description.value;
  
//   // Check if description is provided
//   if (!ticketDescription || ticketDescription.trim() === '') {
//     // Acknowledge with error - this will show an error message to the user
//     await ack({
//       response_action: "errors",
//       errors: {
//         ticket_description_block: "Please provide ticket details"
//       }
//     });
//     return;
//   }
  
//   // All fields are valid, acknowledge the submission
//   await ack();
  
//   const userId = body.user.id;
  
//   try {
//     // Parse the ticket description to extract key information
//     const parsedTicket = parseTicketDescription(ticketDescription);
    
//     // In a real implementation, you would create a Jira ticket here using the Jira API
//     // For example:
//     // const jiraTicket = await createJiraTicket(parsedTicket);
    
//     // Generate a mock ticket ID for this example
//     const ticketId = `PROJ-${Math.floor(1000 + Math.random() * 9000)}`;
    
//     // If any required fields are missing, inform the user
//     const missingFields = [];
//     if (!parsedTicket.summary) missingFields.push('summary/description');
//     if (!parsedTicket.priority) missingFields.push('priority');
//     if (!parsedTicket.type) missingFields.push('ticket type');
    
//     if (missingFields.length > 0) {
//       // Open a DM with the user to request more information
//       const conversationResponse = await client.conversations.open({
//         users: userId
//       });
      
//       const dmChannelId = conversationResponse.channel.id;
      
//       // Send message requesting additional information
//       await client.chat.postMessage({
//         channel: dmChannelId,
//         text: `I need more information to create your ticket. Please provide: ${missingFields.join(', ')}`,
//         blocks: [
//           {
//             "type": "section",
//             "text": {
//               "type": "mrkdwn",
//               "text": `I need more information to create your Jira ticket. Please provide the following details:`
//             }
//           },
//           {
//             "type": "section",
//             "text": {
//               "type": "mrkdwn",
//               "text": missingFields.map(field => `• *${field}*`).join('\n')
//             }
//           },
//           {
//             "type": "section",
//             "text": {
//               "type": "mrkdwn",
//               "text": "You can mention me again with the complete details."
//             }
//           }
//         ]
//       });
      
//       return;
//     }
    
//     // All required information is available, send a confirmation message
//     try {
//       // Open a DM with the user
//       const conversationResponse = await client.conversations.open({
//         users: userId
//       });
      
//       const dmChannelId = conversationResponse.channel.id;
      
//       // Send confirmation message in DM
//       await client.chat.postMessage({
//         channel: dmChannelId,
//         text: `✅ Jira ticket created successfully!`,
//         blocks: [
//           {
//             "type": "header",
//             "text": {
//               "type": "plain_text",
//               "text": "✅ Jira Ticket Created",
//               "emoji": true
//             }
//           },
//           {
//             "type": "section",
//             "fields": [
//               {
//                 "type": "mrkdwn",
//                 "text": `*Ticket ID:*\n${ticketId}`
//               },
//               {
//                 "type": "mrkdwn",
//                 "text": `*Type:*\n${parsedTicket.type || 'Not specified'}`
//               }
//             ]
//           },
//           {
//             "type": "section",
//             "fields": [
//               {
//                 "type": "mrkdwn",
//                 "text": `*Priority:*\n${parsedTicket.priority || 'Not specified'}`
//               },
//               {
//                 "type": "mrkdwn",
//                 "text": `*Assignee:*\n${parsedTicket.assignee || 'Not assigned'}`
//               }
//             ]
//           },
//           {
//             "type": "section",
//             "text": {
//               "type": "mrkdwn",
//               "text": `*Description:*\n${parsedTicket.summary || ticketDescription}`
//             }
//           },
//           ...(parsedTicket.label ? [
//             {
//               "type": "context",
//               "elements": [
//                 {
//                   "type": "mrkdwn",
//                   "text": `*Label:* ${parsedTicket.label}`
//                 }
//               ]
//             }
//           ] : [])
//         ]
//       });
//     } catch (dmError) {
//       console.error('Error sending DM confirmation:', dmError);
//     }
    
//   } catch (error) {
//     console.error('Error creating Jira ticket:', error);
//   }
// });

// /**
//  * Parse the ticket description to extract key information
//  * This uses simple pattern matching to identify ticket attributes
//  */
// function parseTicketDescription(description) {
//   const result = {
//     summary: null,
//     priority: null,
//     type: null,
//     assignee: null,
//     label: null
//   };
  
//   // Extract priority
//   const priorityRegex = /priority\s+is\s+(high|medium|low)/i;
//   const priorityMatch = description.match(priorityRegex);
//   if (priorityMatch) {
//     result.priority = priorityMatch[1].toLowerCase();
//   }
  
//   // Extract ticket type
//   const typeRegex = /ticket\s+type\s+is\s+(bug|task|story)/i;
//   const typeMatch = description.match(typeRegex);
//   if (typeMatch) {
//     result.type = typeMatch[1].toLowerCase();
//   }
  
//   // Extract assignee
//   const assigneeRegex = /assign\s+(?:it\s+)?to\s+([a-z\s]+?)(?:\s+where|$|\s+and)/i;
//   const assigneeMatch = description.match(assigneeRegex);
//   if (assigneeMatch) {
//     result.assignee = assigneeMatch[1].trim();
//   }
  
//   // Extract label
//   const labelRegex = /label\s+is\s+([a-z0-9_]+)/i;
//   const labelMatch = description.match(labelRegex);
//   if (labelMatch) {
//     result.label = labelMatch[1].trim();
//   }
  
//   // Extract summary (take the beginning of the description or use the whole thing if no other patterns match)
//   const summaryRegex = /^(.*?)(?:where\s+priority|and\s+assign)/i;
//   const summaryMatch = description.match(summaryRegex);
//   if (summaryMatch) {
//     result.summary = summaryMatch[1].replace(/create\s+a\s+ticket\s+/i, '').trim();
//     if (!result.summary) {
//       // If nothing remains after removing "create a ticket", use a portion of the original description
//       result.summary = description.split(/where\s+priority|and\s+assign/i)[0].trim();
//     }
//   } else {
//     // If we can't identify a clear summary, use the original description
//     result.summary = description;
//   }
  
//   return result;
// }
