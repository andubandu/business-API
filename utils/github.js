const axios = require('axios');

async function analyzeGitHubProfile(githubUrl) {
  try {
    const username = githubUrl.split('/').pop();
    const userResponse = await axios.get(`https://api.github.com/users/${username}`);
    const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`);
    
    const user = userResponse.data;
    const repos = reposResponse.data;
    
    const recentRepos = repos.filter(repo => {
      const lastUpdate = new Date(repo.updated_at);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return lastUpdate > sixMonthsAgo;
    });
    
    const languages = [...new Set(repos.map(repo => repo.language).filter(Boolean))];
    
    let activityScore = 0;
    activityScore += Math.min(user.public_repos * 2, 50);
    activityScore += Math.min(recentRepos.length * 5, 30);
    activityScore += Math.min(languages.length * 3, 20);
    
    const profileComplete = user.bio && user.location && user.blog;
    
    return {
      total_repos: user.public_repos,
      recent_commits: recentRepos.length,
      languages: languages,
      activity_score: activityScore,
      profile_complete: profileComplete
    };
  } catch (error) {
    return {
      total_repos: 0,
      recent_commits: 0,
      languages: [],
      activity_score: 0,
      profile_complete: false
    };
  }
}

async function validatePortfolioUrl(url) {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

module.exports = { analyzeGitHubProfile, validatePortfolioUrl };