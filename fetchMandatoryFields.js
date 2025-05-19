require('dotenv').config();
const axios = require('axios');

const jirabaseurl = 'https://capillarytech.atlassian.net'; // Replace with your Jira domain
const jiraemail = 'gourav.hanumante@capillarytech.com'; // Replace with your Jira email
const apiToken = process.env.JIRA_API_KEY; // Replace with your Jira API token

async function fetchRequiredFields(projectKey, issueTypeName) {
  const url = `${jirabaseurl}/rest/api/2/issue/createmeta`;

  // Log the URL and parameters that will be used in the API call
  console.log('Making API call to fetch required fields');
  console.log('URL:', url);
  console.log('Parameters:', {
    projectKeys: projectKey,
    issuetypeNames: issueTypeName,
    expand: 'projects.issuetypes.fields',
  });

  try {
    const response = await axios.get(url, {
      auth: {
        username: jiraemail,
        password: apiToken,
      },
      headers: {
        'Accept': 'application/json',
      },
      params: {
        projectKeys: projectKey,
        issuetypeNames: issueTypeName,
        expand: 'projects.issuetypes.fields',
      },
    });

    // Log the response data
    console.log('API response:', response.data);

    const fields =
      response.data?.projects?.[0]?.issuetypes?.[0]?.fields || {};

    const requiredFieldKeys = Object.entries(fields)
      .filter(([_, field]) => field.required)
      .map(([fieldKey]) => fieldKey);

    // Log the required field keys
    console.log('Required field keys:', requiredFieldKeys);

    return requiredFieldKeys;
  } catch (error) {
    // Log error details
    console.error('Failed to fetch required fields:', error.response?.data || error.message);
    return [];
  }
}

module.exports = fetchRequiredFields