const allowedRoles = [
  "client",
  "backend", "frontend", "fullstack",
  "rust", "cpp", "cs", "systems-developer", "embedded-developer", "firmware-developer", "device-driver-developer", "kernel-developer",
  "web-developer", "frontend-developer", "backend-developer", "fullstack-developer",
  "mobile-developer", "ios-developer", "android-developer", "flutter-developer", "react-native-developer",
  "game-developer", "graphics-programmer", "unity-developer", "unreal-developer", "vr-developer", "ar-developer",
  "devops-engineer", "site-reliability-engineer", "cloud-engineer", "infrastructure-engineer", "platform-engineer", "release-engineer",
  "data-engineer", "data-scientist", "ml-engineer", "ai-engineer", "deep-learning-engineer", "nlp-engineer", "cv-engineer", "mleops-engineer", "big-data-developer", "data-visualization-developer",
  "security-engineer", "application-security-engineer", "penetration-tester", "red-teamer", "reverse-engineer",
  "blockchain-developer", "smart-contract-developer", "solidity-developer", "web3-developer", "dapp-developer",
  "qa-engineer", "test-automation-engineer", "manual-tester", "performance-tester",
  "ui-developer", "ux-developer", "graphic-designer", "ui-ux-designer", "product-designer",
  "simulation-developer", "bioinformatics-developer", "quant-developer", "hardware-software-integration-developer", "robotics-developer", "audio-software-developer", "financial-software-developer",
  "scripting-developer", "build-engineer", "ci-cd-engineer",
  "no-code-developer", "low-code-developer",
  "technical-writer", "project-manager", "product-manager", "scrum-master", "technical-support-engineer", "database-administrator", "network-engineer",
  "vibecoder"
];

const roleQuestions = {
  "backend": [
    "What database technologies have you worked with?",
    "Describe your experience with API design and development",
    "How do you handle authentication and authorization in your applications?"
  ],
  "frontend": [
    "Which JavaScript frameworks/libraries do you prefer and why?",
    "How do you ensure cross-browser compatibility?",
    "Describe your approach to responsive web design"
  ],
  "fullstack": [
    "Describe a full-stack project you've built from scratch",
    "How do you manage state between frontend and backend?",
    "What deployment strategies do you use?"
  ],
  "mobile-developer": [
    "Which mobile platforms have you developed for?",
    "How do you handle different screen sizes and orientations?",
    "Describe your experience with app store deployment"
  ],
  "devops-engineer": [
    "What CI/CD tools have you used?",
    "How do you monitor application performance in production?",
    "Describe your experience with containerization"
  ],
  "data-scientist": [
    "What machine learning frameworks do you use?",
    "How do you handle data preprocessing and cleaning?",
    "Describe a data analysis project you've completed"
  ],
  "game-developer": [
    "Which game engines have you worked with?",
    "How do you optimize game performance?",
    "Describe your experience with game physics or AI"
  ],
  "blockchain-developer": [
    "Which blockchain platforms have you developed on?",
    "How do you ensure smart contract security?",
    "Describe your experience with DeFi or NFT projects"
  ]
};

module.exports = {
    roleQuestions,
    allowedRoles
}