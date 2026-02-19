# 📊 WealthWise 

WealthWise is a modern, responsive personal finance web application designed to help users track spending, analyze financial behavior, and plan goals efficiently. Built with a robust React frontend and a FastAPI backend powered by AI insights.

## 🚀 Key Features

-   **💰 Transaction Tracking**: Effortlessly record and categorize your daily expenses and income.
-   **📈 Financial Insights**: Visualize your spending patterns with interactive charts and reports.
-   **🎯 Goal Planning**: Set and monitor financial goals, from emergency funds to vacation savings.
-   **🤖 AI-Powered Analysis**: Leverage FinGPT and Scikit-Learn models for personalized financial advice and market analysis.
-   **✉️ Smart Alerts**: Receive email notifications for budget limits and important financial milestones.
-   **🛡️ Secure Auth**: Robust authentication system powered by Firebase.

## 🛠 Tech Stack

### Frontend
-   **Framework**: [React](https://reactjs.org/) (with TypeScript)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
-   **State Management**: React Hooks & Context API
-   **Backend Intregration**: Axios

### Backend
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
-   **AI Engines**: FinGPT, Scikit-Learn, Google Gemini
-   **Database**: Firebase Firestore
-   **Authentication**: Firebase Auth

## 💻 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Python (3.9+)
-   Firebase Account

### 🔧 Frontend Setup
1.  **Clone the repository**:
    ```bash
    git clone <your-repository-url>
    cd wealth-wise
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure environment variables**:
    -   Copy `.env.example` to `.env`.
    -   Fill in your Firebase credentials and Backend URL.
    ```bash
    cp .env.example .env
    ```
4.  **Run the development server**:
    ```bash
    npm run dev
    ```

### 🐍 Backend Setup
1.  **Navigate to the backend directory**:
    ```bash
    cd backend
    ```
2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Configure environment variables**:
    -   Copy `env.example` to `.env`.
    -   Add your API keys (Gemini, Finnhub, etc.).
4.  **Run the FastAPI server**:
    ```bash
    python main.py
    ```

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start frontend development server |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |
| `python backend/main.py` | Start backend API server |

## 🛡️ Security

Environment variables are managed via `.env` files. Ensure that:
-   `.env` is never committed to version control (already added to `.gitignore`).
-   Template variables are kept updated in `.env.example`.

## 🏁 Conclusion

WealthWise aims to simplify personal finance management by combining a clean UI, fast performance, and intelligent AI-driven insights, making financial planning accessible for everyone.