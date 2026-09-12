"""Generates a synthetic Sample_JD.txt and 18 synthetic resumes for development. Replace with the real PDFs on the day."""
from pathlib import Path

D = Path(__file__).parent
R = D / "resumes"
R.mkdir(exist_ok=True)

JD = """Junior Full Stack Developer Intern
TechNova Solutions · Bengaluru · 6-month internship

About the role:
TechNova Solutions is looking for a young, energetic Junior Full Stack Developer Intern to join our product team. You will work closely with senior engineers to build features across our web platform.

Responsibilities:
- Build and maintain responsive web interfaces using React
- Develop backend services and REST APIs with Node.js
- Work with MongoDB or PostgreSQL databases to store and query application data
- Collaborate with designers and product managers in an agile team
- Write clean, well-documented code and participate in code reviews
- Debug and fix issues across the stack

Requirements:
- Strong knowledge of JavaScript, HTML and CSS
- Hands-on experience with React or a similar frontend framework
- Experience building backend services with Node.js
- Familiarity with Git and GitHub workflows
- 3+ years of professional experience in software development
- Currently pursuing a B.Tech in Computer Science from a tier-1 institution
- Good communication and problem-solving skills

Nice to have:
- Exposure to Docker or cloud platforms such as AWS
- Experience with TypeScript
- Knowledge of testing frameworks such as Jest
- Prior internship or hackathon experience
"""

RESUMES = {
"01_priya_sharma": """Priya Sharma
priya.sharma@email.com | +91 98765 43210 | github.com/priyasharma

EDUCATION
B.Tech Computer Science, Manipal Institute of Technology, 2023 - 2027, CGPA 8.9

EXPERIENCE
Software Development Intern, Zeta Labs, May 2025 - Jul 2025
- Built REST APIs with Node.js and Express serving 40k requests/day for the payments dashboard
- Developed React components with TypeScript and Redux for the merchant portal
- Wrote Jest unit tests raising coverage from 40% to 82%
- Containerised services with Docker and deployed to AWS ECS via GitHub Actions CI/CD

PROJECTS
- CampusCart: MERN stack marketplace with JWT authentication, MongoDB aggregation pipelines; deployed on Vercel and Render
- DevTracker: Next.js + PostgreSQL app for tracking open-source contributions

SKILLS
JavaScript, TypeScript, React, Node.js, Express, MongoDB, PostgreSQL, Docker, AWS, Git, Jest, Tailwind CSS
""",
"02_arjun_mehta": """Arjun Mehta
arjun.mehta@email.com | 9876501234

Education
B.E. Information Technology, RV College of Engineering, 2022 - 2026

Experiance
Web Developer Intern, StartupHub, Jan '25 - Present
- built REST APIs with Express and MongoDB for a booking platform used by 2,000 users
- created responsive pages with HTML, CSS and vanilla JavaScript
- fixed bugs reported by customers and worked with the design team

Projects
- Hostel Mess Feedback App: Express backend, EJS frontend, MongoDB
- Portfolio website with animations

Technologies
HTML, CSS, JavaScript, Express, MongoDB, Git, Bootstrap
""",
"03_sneha_iyer": """Sneha Iyer
sneha.iyer@email.com

EDUCATION
B.Tech CSE, VIT Vellore, 2023-2027, CGPA 9.1

WORK EXPERIENCE
Frontend Intern, PixelWorks, 06/2025 - 08/2025
- Designed and shipped React dashboards with Tailwind CSS used by 15 enterprise clients
- Integrated GraphQL APIs and optimised rendering, cutting load time by 35%
- Collaborated in two-week sprints with product and QA teams

PROJECTS
- Habit tracker built with React, Firebase auth and Firestore
- Chrome extension for tab management (JavaScript)

SKILLS
React, JavaScript, TypeScript, Tailwind, Figma, Git, Firebase
""",
"04_rahul_verma": """Rahul Verma
rahul.verma@email.com | linkedin.com/in/rahulverma

Education
B.Tech Mechanical Engineering, NIT Trichy, 2022 - 2026

Experience
Research Intern, Thermal Systems Lab, Jun 2025 - Jul 2025
- Simulated heat exchanger performance in MATLAB and ANSYS
- Prepared technical reports and presented weekly findings

Projects
- Designed a solar dryer prototype using SolidWorks
- Python script to automate data logging from lab sensors

Skills
MATLAB, ANSYS, SolidWorks, Python, AutoCAD, MS Excel
""",
"05_ananya_rao": """Ananya Rao
ananya.rao@email.com | +91 90000 11111

EDUCATION
B.Tech Computer Science, PES University, 2023 - 2027

EXPERIENCE
Backend Developer Intern, FinEdge, March 2025 to May 2025
- Developed microservices in Python using FastAPI and PostgreSQL
- Implemented OAuth2 authentication and role-based access control
- Wrote pytest suites and set up GitHub Actions pipelines
- Deployed services on GCP Cloud Run with Docker

PROJECTS
- Expense splitter web app: Flask backend, React frontend, SQLite
- CLI tool in Go for log analysis

SKILLS
Python, FastAPI, Flask, PostgreSQL, Docker, GCP, Git, React (basic), SQL
""",
"06_karan_singh": """Karan Singh
karan.singh@email.com

Education
BCA, Christ University, 2023 - 2026

Internships
Full Stack Developer Intern, BuildIt Technologies, Jan 2025 - Apr 2025
- Worked on a MERN stack CRM: React frontend, Node.js/Express backend, MongoDB
- Built REST endpoints for lead management and integrated Razorpay payments
- Deployed the app on Heroku and later migrated to AWS EC2
- Used Git for version control and reviewed pull requests from juniors

Projects
- Real-time chat app using Socket.io, Node.js and React
- Blog platform with Next.js and MongoDB

Skills
JavaScript, React, Node.js, Express, MongoDB, HTML, CSS, Git, AWS, Socket.io
""",
"07_meera_nair": """Meera Nair
meera.nair@email.com | 9123456789

EDUCATION
B.Sc Computer Science, St. Joseph's College, 2022 - 2025

EXPERIENCE
Data Analyst Intern, Insight Analytics, 2024 - 2025
- Cleaned and analysed sales datasets using pandas and SQL
- Built Tableau dashboards for the sales leadership team
- Presented insights in weekly stakeholder meetings

PROJECTS
- Customer churn prediction with scikit-learn
- Basic personal website with HTML and CSS

SKILLS
Python, pandas, SQL, Tableau, Excel, HTML, CSS, scikit-learn
""",
"08_vikram_das": """Vikram Das
vikram.das@email.com | github.com/vikramd

EDUCATION
B.Tech Computer Science, IIT Guwahati, 2023 - 2027, CGPA 8.4

EXPERIENCE
Software Engineering Intern, CloudNine, May 2025 - Jul 2025
- Built a TypeScript + React admin console with server-side rendering in Next.js
- Designed Node.js REST APIs backed by PostgreSQL with Prisma ORM
- Added Jest and Cypress tests; integrated into the CI/CD pipeline
- Containerised the stack with Docker Compose for local development

PROJECTS
- Winner, HackNova 2025: built a campus events platform (React, Express, MongoDB) in 36 hours
- Open-source contributor to a popular React component library

SKILLS
TypeScript, JavaScript, React, Next.js, Node.js, Express, PostgreSQL, MongoDB, Docker, Jest, Cypress, Git
""",
"09_divya_menon": """Divya Menon
divya.menon@email.com

Education
B.Tech Electronics and Communication, Amrita University, 2022 - 2026

Experience
Embedded Systems Intern, RoboWorks, Jun 2025 - Jul 2025
- Programmed STM32 microcontrollers in C for a line-following robot
- Debugged UART and I2C communication issues with a logic analyser

Projects
- IoT weather station with ESP32 and a small Flask dashboard
- Arduino-based home automation

Skills
C, C++, Embedded C, Arduino, ESP32, Python (basic), Flask (basic)
""",
"10_rohan_gupta": """Rohan Gupta
rohan.gupta@email.com | 9988776655

Education
B.Tech CSE, SRM University, 2023 - 2027

Experience
Web Development Intern, Digital Bloom Agency, 2025
- Created marketing websites for clients using WordPress and Elementor
- Customised themes with HTML, CSS and jQuery
- Handled SEO setup and Google Analytics tracking

Projects
- Portfolio site built with HTML/CSS/JavaScript
- Simple to-do app in React (tutorial based)

Skills
HTML, CSS, JavaScript, jQuery, WordPress, Photoshop, React (beginner)
""",
"11_ishita_bose": """Ishita Bose
ishita.bose@email.com | linkedin.com/in/ishitabose

EDUCATION
B.Tech Computer Science, Jadavpur University, 2023 - 2027, CGPA 8.7

EXPERIENCE
Full Stack Intern, Nimbus Health, Jan 2025 - Mar 2025
- Shipped patient-intake forms in React with form validation and accessibility fixes
- Wrote Node.js services using Express and Mongoose for appointment scheduling
- Added JWT-based authentication and rate limiting
- Participated in daily stand-ups and sprint retrospectives with a 6-person team

PROJECTS
- LibraryOS: MERN stack library management with role-based dashboards, deployed on Render
- Quiz app with React and Supabase

SKILLS
JavaScript, React, Node.js, Express, MongoDB, Supabase, Git, GitHub, HTML, CSS, Tailwind
""",
"12_aditya_kulkarni": """Aditya Kulkarni
aditya.k@email.com

Education
B.Tech Computer Science, COEP Pune, 2022 - 2026

Experience
Android Developer Intern, AppForge, May 2025 - Jul 2025
- Developed features for a food delivery app in Kotlin with Jetpack Compose
- Integrated REST APIs using Retrofit and handled offline caching with Room
- Fixed crashes reported via Firebase Crashlytics

Projects
- Flutter expense tracker with Firebase backend
- Kotlin-based notes app published on Play Store (1k downloads)

Skills
Kotlin, Java, Android, Jetpack Compose, Flutter, Dart, Firebase, Git, REST APIs
""",
"13_neha_reddy": """Neha Reddy
neha.reddy@email.com | 9000012345

EDUCATION
B.Tech Information Technology, VNR VJIET, 2023 - 2027

EXPERIENCE
Software Intern, Quikr Systems, Jun 2025 - Aug 2025
- Built internal tools in Java with Spring Boot and MySQL
- Wrote JUnit tests and documented APIs using Swagger
- Used Git and Jira in an agile team

PROJECTS
- Online voting system with Spring Boot and Thymeleaf
- Personal finance dashboard in React consuming a Spring REST API

SKILLS
Java, Spring Boot, MySQL, JUnit, Git, Jira, React (basic), HTML, CSS
""",
"14_sameer_khan": """Sameer Khan
sameer.khan@email.com

Education
B.Com, Delhi University, 2022 - 2025

Experience
Marketing Intern, BrandLift, 2024
- Managed social media calendars and ran Instagram ad campaigns
- Prepared monthly performance decks in PowerPoint

Projects
- Organised a college fest sponsorship drive raising 2 lakh rupees

Skills
Canva, MS Office, Social Media Marketing, Communication, Public Speaking
""",
"15_tanvi_joshi": """Tanvi Joshi
tanvi.joshi@email.com | github.com/tanvij

EDUCATION
B.Tech Computer Science, DA-IICT, 2023 - 2027, CGPA 9.3

EXPERIENCE
SDE Intern, Razorpay, May 2025 - Jul 2025
- Developed a merchant onboarding flow in React and TypeScript with a Node.js BFF layer
- Wrote GraphQL resolvers and optimised PostgreSQL queries, cutting p95 latency by 40%
- Added Jest and Playwright tests; contributed to the team's GitHub Actions workflows
- Deployed preview environments using Docker and AWS

PROJECTS
- Smart India Hackathon finalist: real-time disaster alert platform (React, Node.js, MongoDB, WebSockets)
- Maintainer of a small open-source TypeScript utility library

SKILLS
TypeScript, JavaScript, React, Node.js, GraphQL, PostgreSQL, MongoDB, Docker, AWS, Jest, Playwright, Git
""",
"16_harsh_patel": """Harsh Patel
harsh.patel@email.com | 9876543210

Education
B.Tech Computer Science, Nirma University, 2022 - 2026

Experience
Machine Learning Intern, VisionAI Labs, Jun 2025 - Aug 2025
- Trained image classification models with PyTorch achieving 94% accuracy
- Built a small Flask API to serve model predictions
- Used Git and Docker for experiment reproducibility

Projects
- Face mask detection with OpenCV and TensorFlow
- Kaggle competitions (top 10%)

Skills
Python, PyTorch, TensorFlow, OpenCV, Flask, Docker, Git, NumPy, pandas
""",
"17_pooja_desai": """Pooja Desai
pooja.desai@email.com

EDUCATION
B.Tech Computer Science, MIT Manipal, 2023 - 2027

EXPERIENCE
Frontend Developer Intern, ShopEase, Feb 2025 - Apr 2025
- Built product listing and checkout pages in React with Redux Toolkit
- Implemented responsive layouts with CSS modules and Tailwind
- Consumed REST APIs and handled loading and error states
- Collaborated with backend engineers on API contracts

PROJECTS
- Weather app using React and the OpenWeather API
- Recipe finder built with Vue.js and Firebase

SKILLS
JavaScript, React, Redux, Vue, HTML, CSS, Tailwind, Git, REST APIs
""",
"18_manish_yadav": """MANISH YADAV
manish.yadav@email.com  |  9811122233  |  Delhi

EDUCATION
Diploma in Computer Applications, 2023 - 2025

EXPERIANCE
IT Support Intern, Local Systems Pvt Ltd, 01/2025-now
- Installed and configured Windows systems and printers for 50+ staff
- Handled helpdesk tickets and basic network troubleshooting

PROJECTS
- Built a simple inventory tracker in Excel with macros
- Made a static HTML page for a family business

SKILLS
Windows, Networking basics, MS Excel, HTML, Customer Support
""",
}

(D / "Sample_JD.txt").write_text(JD, encoding="utf-8")
for f in R.glob("*.txt"):
    f.unlink()
for name, text in RESUMES.items():
    (R / f"{name}.txt").write_text(text.strip() + "\n", encoding="utf-8")
print("wrote", len(RESUMES), "resumes")
