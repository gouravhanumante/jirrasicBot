require('dotenv').config();
const axios = require('axios');
const jirabaseurl = 'https://capillarytech.atlassian.net'; 
const jiraemail = 'gourav.hanumante@capillarytech.com'; // Replace with your Jira email
const apiToken = process.env.JIRA_API_KEY; // Replace with your Jira API token


async function fetchSpecificCustomFields(fieldIds) {
    const url = `${jirabaseurl}/rest/api/2/field`;
  
    console.log('Making API call to fetch all fields');
    console.log('URL:', url);
  
    try {
      const response = await axios.get(url, {
        auth: {
          username: jiraemail,
          password: apiToken,
        },
        headers: {
          'Accept': 'application/json',
        },
      });
  
      // console.log('API response:', response.data);
  
      const fields = response.data;
      const customFields = fields.filter(field => fieldIds.includes(field.id));
  
      customFields.forEach(field => {
        console.log(`Field ID: ${field.id}`);
        console.log(`Name: ${field.name}`);
        console.log(`Description: ${field.description || 'No description available'}`);
        console.log(`Type: ${field.schema?.type || 'N/A'}`);
        console.log('--------------------------');
      });
  
      // Create a map with field.id as the key
      const customFieldsMap = {};
      customFields.forEach(field => {
        customFieldsMap[field.id] = field;
      });
  
      return customFieldsMap;
    } catch (error) {
      console.error('Failed to fetch custom fields:', error.response?.data || error.message);
      return {};
    }
  }
  
let nameToIdMap = {};
async function buildFieldNameMap() {
  const allFields = await fetchSpecificCustomFields([]); // or fetch all fields directly
  Object.values(allFields).forEach(field => {
    nameToIdMap[field.name.toLowerCase()] = field.id;
  });
}

module.exports = fetchSpecificCustomFields