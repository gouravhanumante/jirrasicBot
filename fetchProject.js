require('dotenv').config();
const axios = require('axios');

const jirabaseurl = 'https://capillarytech.atlassian.net'; // Replace with your Jira domain
const jiraemail = 'gourav.hanumante@capillarytech.com'; // Replace with your Jira email
const apiToken = process.env.JIRA_API_KEY; // Replace with your Jira API token


async function fetchAllJiraProjects() {
    try {
        const response = await axios.get(`${jirabaseurl}/rest/api/2/project`, {
            auth: {
                username: jiraemail,
                password: apiToken,
            },
            headers: {
                'Accept': 'application/json'
            }
        });

        const projects = response.data.map((proj) => ({
            id: proj.id,
            key: proj.key,
            name: proj.name
        }));

        console.log(projects);
        return projects;
    } catch (error) {
        console.error('Failed to fetch Jira projects:', error.response?.data || error.message);
        return [];
    }
}


fetchAllJiraProjects()
    .then(projects => {
        const projectKeys = projects.map(project => project.key);
        console.log('Projects:', projectKeys);
    })
    .catch(error => {
        console.error('Error:', error);
    });



// [
//   { id: '11392', key: 'ABR', name: 'Asia Business Requirements' },
//   { id: '11393', key: 'INA', name: 'Implementations North America' },
//   { id: '11394', key: 'SCE', name: 'Solution Consultations' },
//   { id: '11395', key: 'RH', name: 'Rewards+ Historical' },
//   { id: '11397', key: 'GAL', name: 'Galaxy' },
//   { id: '11399', key: 'INF', name: 'Infosec -Internal' },
//   { id: '11528', key: 'GTMS', name: 'Go to market sample' },
//   { id: '11400', key: 'SI', name: 'Salesforce Integration' },
//   { id: '11401', key: 'GAT', name: 'Gateways' },
//   { id: '11529', key: 'VM', name: 'Vulnerability Management' },
// ]