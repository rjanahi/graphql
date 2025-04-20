// GraphQL Query Function
async function fetchData(query) {
    const response = await fetch('YOUR_GRAPHQL_ENDPOINT', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
    });
    return response.json();
}

// Function to fetch registrations and user skills
async function getUserSkills() {
    const query = `
    query {
      registration {
        id
        registrationUsers {
          id
          user {
            id
            xps {
              amount
            }
          }
        }
      }
    }`;
    
    const data = await fetchData(query);
    const registrations = data.data.registration;

    const userSkills = registrations.flatMap(reg => 
      reg.registrationUsers.map(userReg => ({
        userId: userReg.user.id,
        totalXP: userReg.user.xps ? userReg.user.xps.reduce((sum, xp) => sum + xp.amount, 0) : 0
      }))
    );

    // Filter out users without XP
    return userSkills.filter(user => user.totalXP > 0);
}

// Function to fetch XP earned by project
async function getXPEarnedByProject() {
    const query = `
    query {
      event {
        id
        xps {
          amount
        }
      }
    }`;

    const data = await fetchData(query);
    return data.data.event.map(event => ({
        eventId: event.id,
        totalXP: event.xps.reduce((sum, xp) => sum + xp.amount, 0)
    }));
}

// Function to fetch audit ratios
async function getAuditRatios() {
    const query = `
    query {
      audit {
        id
        grade
      }
    }`;

    const data = await fetchData(query);
    return data.data.audit.map(audit => ({
        auditId: audit.id,
        grade: audit.grade
    }));
}

// Example usage
async function fetchAllData() {
    try {
        const skills = await getUserSkills();
        console.log('User Skills:', skills);

        const xpData = await getXPEarnedByProject();
        console.log('XP Earned by Project:', xpData);

        const auditData = await getAuditRatios();
        console.log('Audit Ratios:', auditData);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Execute the fetch
fetchAllData();