const allowedRoles = [
  "client",
  "backend", "frontend", "fullstack",
  "rust", "cpp", "cs", "systems-developer", "embedded-developer", "firmware-developer", "device-driver-developer", "kernel-developer",
  "web-developer",
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
  ],
    "rust": [
    "What types of projects have you developed using Rust?",
    "How do you manage memory and concurrency in Rust applications?",
    "Describe your experience with Rust's ownership model and borrow checker"
  ],
  "cpp": [
    "What C++ standards (e.g. C++11, C++17) are you most comfortable with?",
    "How do you manage memory and avoid leaks in C++?",
    "Describe a complex system or application you've built using C++"
  ],
  "cs": [
    "Which core computer science concepts do you apply regularly in your work?",
    "How do you approach algorithmic problem solving?",
    "Can you describe a time when understanding data structures made a big impact on your solution?"
  ],
  "systems-developer": [
    "What kind of low-level system components have you built or worked on?",
    "How do you approach debugging in a systems environment?",
    "Describe your experience with memory management and performance tuning"
  ],
  "embedded-developer": [
    "Which microcontrollers or platforms have you worked with?",
    "How do you handle real-time constraints in embedded systems?",
    "Describe your approach to debugging and testing embedded code"
  ],
    "firmware-developer": [
    "What kind of hardware have you developed firmware for?",
    "How do you ensure stability and reliability in low-level firmware?",
    "Describe your process for debugging firmware in production environments"
  ],
  "device-driver-developer": [
    "What operating systems have you developed device drivers for?",
    "How do you handle interrupt handling and DMA in drivers?",
    "Can you explain a challenge you faced developing a custom device driver?"
  ],
  "kernel-developer": [
    "Have you contributed to any open-source kernels or custom RTOS?",
    "How do you manage concurrency and synchronization in kernel space?",
    "What’s your approach to writing and debugging kernel modules?"
  ],
  "web-developer": [
    "What web technologies and stacks do you specialize in?",
    "How do you handle client-server communication securely?",
    "Describe how you optimize performance in high-traffic web applications"
  ],
  "ios-developer": [
    "What iOS frameworks do you typically work with (e.g., UIKit, SwiftUI)?",
    "How do you manage memory and performance in iOS applications?",
    "Describe your experience with App Store guidelines and app submission"
  ],
  "android-developer": [
    "What are your preferred tools and libraries for Android development?",
    "How do you ensure backward compatibility across Android versions?",
    "Describe how you handle permissions and security in Android apps"
  ],
  "flutter-developer": [
    "What kinds of apps have you built using Flutter?",
    "How do you manage state in large Flutter applications?",
    "Describe your experience working with platform channels in Flutter"
  ],
  "react-native-developer": [
    "How do you manage native code integration in React Native projects?",
    "What libraries do you use for navigation and state management?",
    "Can you describe a performance issue you encountered and how you resolved it?"
  ],
   "graphics-programmer": [
    "What graphics APIs have you worked with (e.g., OpenGL, Vulkan, DirectX)?",
    "How do you optimize rendering performance in real-time applications?",
    "Describe a shader or visual effect you implemented from scratch"
  ],
  "unity-developer": [
    "What types of projects have you built with Unity?",
    "How do you structure scenes and assets for large Unity projects?",
    "Describe your experience with Unity’s ECS or DOTS architecture"
  ],
  "unreal-developer": [
    "What is your experience with Blueprints versus C++ in Unreal Engine?",
    "How do you manage performance and optimization in Unreal projects?",
    "Have you worked with multiplayer networking in Unreal? Describe your approach"
  ],
  "vr-developer": [
    "Which VR platforms have you developed for (e.g., Oculus, SteamVR)?",
    "How do you address motion sickness and comfort in VR design?",
    "What challenges have you faced with input handling in VR?"
  ],
  "ar-developer": [
    "What AR SDKs or frameworks have you worked with (e.g., ARKit, ARCore)?",
    "How do you handle tracking and spatial awareness in AR apps?",
    "Describe an AR experience you've built and its technical challenges"
  ],
    "site-reliability-engineer": [
    "How do you define and monitor SLOs/SLAs in production systems?",
    "What tools do you use for observability and incident response?",
    "Describe your approach to minimizing downtime during deployments"
  ],
  "cloud-engineer": [
    "Which cloud providers do you have experience with (e.g., AWS, Azure, GCP)?",
    "How do you manage infrastructure as code in cloud environments?",
    "Describe a project where you optimized cloud cost or performance"
  ],
  "infrastructure-engineer": [
    "How do you design scalable infrastructure for high-availability systems?",
    "What configuration management tools have you used (e.g., Ansible, Terraform)?",
    "Describe your approach to infrastructure security and compliance"
  ],
  "platform-engineer": [
    "What’s your experience building internal developer platforms?",
    "How do you approach standardizing CI/CD pipelines across teams?",
    "Describe how you balance stability and flexibility in platform services"
  ],
  "release-engineer": [
    "How do you manage complex release workflows across multiple environments?",
    "What tools or processes do you use for versioning and rollback?",
    "Can you describe your approach to automating software delivery pipelines?"
  ],
   "data-engineer": [
    "What data pipeline tools have you used (e.g., Apache Airflow, Kafka, Spark)?",
    "How do you ensure data quality and integrity across ETL processes?",
    "Describe your experience with designing data lake or warehouse architectures"
  ],
  "ml-engineer": [
    "How do you transition models from development to production?",
    "What frameworks do you prefer for building and training ML models?",
    "Describe a challenge you faced in maintaining an ML pipeline"
  ],
  "ai-engineer": [
    "What kinds of AI systems have you developed (e.g., recommendation engines, agents)?",
    "How do you evaluate the performance of AI models in real-world applications?",
    "Can you describe your approach to integrating AI into existing products?"
  ],
  "deep-learning-engineer": [
    "What deep learning frameworks have you used (e.g., TensorFlow, PyTorch)?",
    "How do you handle overfitting in complex neural networks?",
    "Describe a project where you used CNNs, RNNs, or transformers"
  ],
  "nlp-engineer": [
    "What NLP models or toolkits have you worked with (e.g., spaCy, HuggingFace Transformers)?",
    "How do you handle preprocessing for noisy or unstructured text data?",
    "Describe a project where you built or fine-tuned a language model"
  ],
  "cv-engineer": [
    "What techniques do you use for image classification or object detection?",
    "How have you optimized computer vision models for real-time applications?",
    "Describe your experience with datasets like COCO or ImageNet"
  ],
  "mleops-engineer": [
    "How do you handle model versioning and deployment in production?",
    "What tools do you use for tracking experiments and metrics?",
    "Describe your approach to building CI/CD pipelines for ML workflows"
  ],
  "big-data-developer": [
    "Which big data processing frameworks have you worked with (e.g., Hadoop, Spark)?",
    "How do you optimize jobs to process data at scale efficiently?",
    "Describe your experience with distributed file systems like HDFS or S3"
  ],
  "data-visualization-developer": [
    "What visualization libraries or tools do you prefer (e.g., D3.js, Tableau, Plotly)?",
    "How do you ensure your visualizations are both informative and accessible?",
    "Describe a complex dataset you visualized and how you presented the insights"
  ],
    "security-engineer": [
    "How do you identify and mitigate security vulnerabilities in large systems?",
    "What tools or practices do you use for threat modeling?",
    "Describe your experience with security audits or compliance standards"
  ],
  "application-security-engineer": [
    "How do you integrate security into the software development lifecycle (SDLC)?",
    "What methods do you use to secure web and API endpoints?",
    "Describe a vulnerability you discovered and how you addressed it"
  ],
  "penetration-tester": [
    "What methodologies do you follow for conducting penetration tests?",
    "Which tools do you commonly use for network and application testing?",
    "Describe an interesting exploit you discovered during a pentest"
  ],
  "red-teamer": [
    "How do you simulate advanced persistent threats (APTs) in red team exercises?",
    "What’s your approach to evading detection during offensive security engagements?",
    "Can you describe a successful red team operation and its outcomes?"
  ],
  "reverse-engineer": [
    "What tools and techniques do you use for reverse engineering binaries?",
    "Describe your process for analyzing obfuscated or packed code",
    "Have you worked on malware analysis or software cracking? If so, describe the challenges"
  ],
    "smart-contract-developer": [
    "Which smart contract platforms have you developed for (e.g., Ethereum, Solana)?",
    "How do you test and audit smart contracts before deployment?",
    "Can you explain a complex contract logic you’ve implemented?"
  ],
  "solidity-developer": [
    "What are some common pitfalls you avoid when writing Solidity code?",
    "How do you optimize gas usage in your contracts?",
    "Describe your experience with OpenZeppelin or other contract libraries"
  ],
  "web3-developer": [
    "How do you integrate wallets like MetaMask into Web3 apps?",
    "What libraries do you use for blockchain interaction (e.g., ethers.js, web3.js)?",
    "Can you describe a full-stack dApp you’ve built and how data flows in it?"
  ],
  "dapp-developer": [
    "How do you structure the frontend/backend architecture of a dApp?",
    "How do you handle on-chain vs off-chain data interactions?",
    "Describe how you ensure your dApps remain decentralized and user-friendly"
  ],
  "qa-engineer": [
    "What is your process for writing and maintaining test cases?",
    "How do you work with developers to ensure quality across the SDLC?",
    "Describe a time you discovered a critical bug and how it was handled"
  ],
  "test-automation-engineer": [
    "Which test automation frameworks have you used (e.g., Selenium, Cypress)?",
    "How do you manage flaky tests in CI pipelines?",
    "Describe your approach to automating tests for APIs and UIs"
  ],
  "manual-tester": [
    "How do you prioritize test cases during exploratory testing?",
    "What tools do you use to track and report bugs?",
    "Describe a project where manual testing uncovered edge case failures"
  ],
  "performance-tester": [
    "Which tools do you use for load and stress testing (e.g., JMeter, Gatling)?",
    "How do you interpret performance test results and identify bottlenecks?",
    "Describe a situation where performance testing led to major optimizations"
  ],
    "ui-developer": [
    "What UI frameworks or component libraries do you prefer and why?",
    "How do you ensure accessibility (a11y) in your UI components?",
    "Describe a complex interface you built and how you handled its state and responsiveness"
  ],
  "ux-developer": [
    "How do you validate user experience decisions with real users?",
    "What tools do you use for wireframing or prototyping?",
    "Describe your process for turning user feedback into actionable design changes"
  ],
  "graphic-designer": [
    "What design software do you use most (e.g., Adobe Suite, Figma, Sketch)?",
    "How do you maintain consistency across visual assets?",
    "Describe a brand identity project you worked on from start to finish"
  ],
  "ui-ux-designer": [
    "How do you balance visual design with usability in interfaces?",
    "Describe your approach to creating and maintaining a design system",
    "How do you collaborate with developers to bring designs to life?"
  ],
  "product-designer": [
    "How do you align design goals with product strategy?",
    "What’s your approach to researching and validating user needs?",
    "Describe a product feature you helped design that significantly impacted users"
  ],
    "simulation-developer": [
    "What kinds of simulations have you developed and in which domains?",
    "Which engines or tools do you use for modeling and running simulations?",
    "How do you ensure simulation accuracy and performance under constraints?"
  ],
  "bioinformatics-developer": [
    "What tools or libraries do you use for genomic or biological data processing?",
    "How do you handle large-scale biological datasets efficiently?",
    "Describe a project where your work supported biological research or diagnostics"
  ],
  "quant-developer": [
    "What financial models or algorithms have you implemented?",
    "Which technologies do you use for low-latency or high-frequency trading systems?",
    "How do you ensure accuracy and performance in numerical computations?"
  ],
  "hardware-software-integration-developer": [
    "How do you approach debugging issues that span both hardware and software?",
    "What communication protocols or interfaces have you worked with (e.g., SPI, UART)?",
    "Describe a project where timing or synchronization was a major challenge"
  ],
  "robotics-developer": [
    "What platforms or frameworks do you use for robotics development (e.g., ROS)?",
    "How do you approach sensor fusion and real-time decision making?",
    "Describe a robotics project you worked on and the hardware/software coordination involved"
  ],
  "audio-software-developer": [
    "What frameworks or languages do you use for audio processing?",
    "How do you manage latency and performance in real-time audio applications?",
    "Describe your experience with DSP (digital signal processing) or VST plugin development"
  ],
  "financial-software-developer": [
    "What types of financial systems have you developed (e.g., accounting, trading, reporting)?",
    "How do you handle precision, accuracy, and compliance in financial calculations?",
    "Describe your experience integrating with banking APIs or financial data feeds"
  ],
   "scripting-developer": [
    "Which scripting languages do you prefer and why?",
    "Describe a task you automated with scripting that saved significant time",
    "How do you ensure your scripts are maintainable and reusable?"
  ],
  "build-engineer": [
    "What build systems have you worked with (e.g., Make, Bazel, CMake)?",
    "How do you optimize build times in large codebases?",
    "Describe your experience handling dependency management during builds"
  ],
  "ci-cd-engineer": [
    "What CI/CD tools and platforms have you implemented or managed?",
    "How do you ensure reliable and fast deployment pipelines?",
    "Describe how you handle rollback and recovery in automated deployments"
  ],
  "no-code-developer": [
    "What no-code platforms do you have experience with?",
    "Describe a complex solution you built without writing traditional code",
    "How do you handle limitations of no-code tools while meeting business requirements?"
  ],
  "low-code-developer": [
    "Which low-code platforms have you worked on?",
    "How do you integrate custom code with low-code solutions when needed?",
    "Describe a project where low-code development accelerated delivery"
  ],
  "technical-writer": [
    "How do you approach creating documentation for complex technical topics?",
    "What tools do you use for writing and maintaining documentation?",
    "Describe how you work with engineers to ensure accuracy in documentation"
  ],
  "project-manager": [
    "How do you handle scope changes during a project?",
    "What project management methodologies are you most familiar with?",
    "Describe a challenging project you managed and how you ensured its success"
  ],
  "product-manager": [
    "How do you prioritize features and manage the product roadmap?",
    "Describe how you gather and incorporate user feedback into product decisions",
    "What metrics do you track to measure product success?"
  ],
  "scrum-master": [
    "How do you facilitate Scrum ceremonies to maximize team productivity?",
    "What techniques do you use to resolve conflicts within Scrum teams?",
    "Describe how you handle impediments that block your team’s progress"
  ],
  "technical-support-engineer": [
    "What’s your approach to troubleshooting complex technical issues?",
    "How do you communicate technical information to non-technical customers?",
    "Describe a time you went above and beyond to resolve a critical support ticket"
  ],
  "database-administrator": [
    "What types of database systems have you administered (SQL, NoSQL)?",
    "How do you handle backup, recovery, and disaster planning for databases?",
    "Describe your experience with database performance tuning and optimization"
  ],
  "network-engineer": [
    "What networking protocols and hardware are you most experienced with?",
    "How do you approach network security and intrusion detection?",
    "Describe a complex network architecture you designed or maintained"
  ]
};

module.exports = {
    roleQuestions,
    allowedRoles
}