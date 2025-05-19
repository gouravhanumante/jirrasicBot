require('dotenv').config();
const axios = require('axios');

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
  
      console.log('API response:', response.data);
  
      const fields = response.data;
      const customFields = fields.filter(field => fieldIds.includes(field.id));
  
      customFields.forEach(field => {
        console.log(`Field ID: ${field.id}`);
        console.log(`Name: ${field.name}`);
        console.log(`Description: ${field.description || 'No description available'}`);
        console.log(`Type: ${field.schema?.type || 'N/A'}`);
        console.log('--------------------------');
      });
  
      return customFields;
    } catch (error) {
      console.error('Failed to fetch custom fields:', error.response?.data || error.message);
      return [];
    }
  }
  

module.exports = fetchSpecificCustomFields