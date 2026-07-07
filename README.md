# CivicEase 🏛️✨
> **Smart Bharat – AI-Powered Civic Companion**
> Built for the PromptWars x Global Prompt Challenge on Hack2skill.

CivicEase is an AI-powered civic companion designed to bridge the gap between citizens and local administration. By leveraging advanced generative AI, the platform simplifies grievance reporting, automates ticket categorization, and provides actionable, real-time insights to civic authorities to improve community welfare.

---

## 🚀 Live Links

* **Live Demo:** [Explore CivicEase Live](https://civic-ease-omega.vercel.app)
* **AI Studio App:** [View in Google AI Studio](https://ai.studio/apps/ae9e6e54-c37a-4983-952f-5eb0bc95cec6)

---

## 🛠️ Key Features

* **AI-Powered Grievance Reporting:** Smart parsing of user complaints to automatically categorize issues (e.g., sanitation, potholes, streetlights).
* **Automated Testing Suite:** Robust test cases ensuring API stability and reliable responses.
* **Security & Efficiency First:** Optimized configuration using TypeScript, environment variable protection, and fast build compilation via Vite.
* **Accessibility (a11y):** Formatted and structured to ensure inclusivity for all citizens using the platform.

---

## 💻 Tech Stack

* **Frontend:** HTML5, TypeScript, Vite
* **Backend/Runtime:** Node.js, TypeScript (`server.ts`)
* **AI Integration:** Gemini API via Google AI Studio
* **Testing:** TypeScript Automated Test Suites (`server.test.ts`)
* **Deployment:** Vercel

---

## ⚙️ Local Development Setup

Follow these steps to get a local copy of CivicEase up and running on your machine.

### Prerequisites

* [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### Installation Steps

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/khushi-saini-23/CivicEase.git](https://github.com/khushi-saini-23/CivicEase.git)
    cd CivicEase
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    * Create a `.env.local` file in the root directory (referencing `.env.example`).
    * Add your Gemini API key:
        ```env
        GEMINI_API_KEY=your_actual_gemini_api_key_here
        ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    Open your browser and navigate to the local server address provided in the terminal (usually `http://localhost:5173`).

---

## 🧪 Testing

To run the automated security, efficiency, and accessibility test suites:
```bash
npm run test
