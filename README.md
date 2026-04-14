# CampusEx 📉📈
> **"Buy into your friends. Sell the fakes. Your campus, your market."**

CampusEx is a gamified, real-time social stock market platform. Users list themselves on the exchange (IPO), trade shares of their peers, place bids on events, and manipulate the market via an AI-powered news moderation engine that dynamically evaluates "campus tea" and drives stock prices upward or downward.

---

## 🏗 System Architecture

CampusEx runs on a high-octane modern web stack composed of Next.js and Go.

```mermaid
graph TD
    subgraph Frontend [Client / Next.js]
        UI[React UI + Tailwind CSS]
        Three[React Three Fiber/Drei 3D]
        AuthHook[AuthContext JWT Interceptor]
        Proxy[Next.js Rewrites]
    end

    subgraph Backend [API / Go + Gin]
        Routes[API Routes]
        JWTMiddleware[JWT Protection]
        Cron[Goroutine Cron Jobs]
        AIEngine[AI Services]
        TradingEngine[Trading & Market Services]
    end

    subgraph Data & External [Infrastructure]
        DB[(PostgreSQL)]
        Gemini[Google Gemini AI]
        GoogleOAuth[Google OAuth 2.0]
    end

    %% Flow
    UI --> AuthHook
    AuthHook --> Proxy
    Proxy -- HTTP/JSON --> JWTMiddleware
    JWTMiddleware --> Routes
    Routes --> TradingEngine
    Routes --> DB
    Cron --> AIEngine
    AIEngine --> Gemini
    AIEngine --> DB
    UI -. OAuth Sign-In .-> GoogleOAuth
```

* **Frontend:** Next.js, Framer Motion, and Three.js elements for immersive 3D charting and interfaces. Secure `window.fetch` hooks automatically inject stateless JWTs without component clutter.
* **Backend:** Go (Gin) micro-monolith running isolated JWT-verified routes for trading, events, and shop.
* **Database:** Highly relational PostgreSQL via GORM managing dynamic user prices, aura coins, wallets, inventory, and news voting queues.

---

## 🔁 Core Data Workflows

### 1. User Onboarding & IPO Flow
When a user joins CampusEx, they do not just sign up—they "go public."

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Server
    participant DB

    User->>Frontend: Clicks "Sign in with Google"
    Frontend->>Server: POST /api/auth/google (OAuth Token)
    Server-->>Frontend: 200 OK (Needs Profile)
    User->>Frontend: Fills "Listing Profile" (Traits, Ticker Symbol)
    Frontend->>Server: POST /api/user/profile
    Server->>DB: Generates Subject ID, Sets Initial Price
    Server-->>Frontend: 200 OK
    User->>Frontend: Picks IPO Date
    Frontend->>Server: POST /api/user/ipo
    Server->>Server: Signs JWT Token
    Server-->>Frontend: Returns JWT + Starts Trading!
    Frontend->>Frontend: Stores Token & Redirects to Dashboard
```

### 2. The AI "Campus Tea" Workflow 🤖
The core manipulation of the market happens through the news engine. Users post news, the community votes, and AI decides the financial impact.

```mermaid
stateDiagram-v2
    [*] --> PendingNews: User Publishes News
    
    state PendingNews {
        direction LR
        User1 --> Vote
        User2 --> Vote
        User3 --> Vote
    }

    PendingNews --> CommunityRejection: Votes < Threshold
    CommunityRejection --> [*]: News Deleted & Ignored

    PendingNews --> Confirmed: Votes ≥ Threshold
    
    Confirmed --> AIEngine: Triggers Background Goroutine
    
    state AIEngine {
        direction TB
        AnalyzeText: Gemini AI Prompt Context 
        AssessImpact: Calculate Impact Percentage (-10% to +10%)
        IdentifySubjects: Fuzzy Match Tagged Profiles
        AnalyzeText --> AssessImpact
        AssessImpact --> IdentifySubjects
    }

    AIEngine --> MarketUpdate: Returns JSON Impact
    MarketUpdate --> AdjustPrices: DB Transactions
    AdjustPrices --> UserPortfolios: Portfolio Net Worth Updates
    UserPortfolios --> [*]
```

### 3. Real-Time Trading Flow
Users buy and sell stakes in specific subjects (users). All math is protected by secure transaction rollbacks.

```mermaid
flowchart TD
    A[User clicks 'Buy $10'] --> B{Has enough Aura Coins?}
    B -- No --> C[Throw 400 Insufficient Funds]
    B -- Yes --> D{Is Market Open?}
    D -- No --> E[Throw 400 Market Closed]
    D -- Yes --> F[Begin SQL Transaction]
    F --> G[Extract Buyer ID via JWT]
    G --> H[Calculate Dynamic Share Formula]
    H --> I[Increase Share Count in User Portfolio]
    I --> J[Bump Subject's Current Price]
    J --> K[Deduct Aura Coins from Buyer]
    K --> L[Commit Transaction]
    L --> M[200 OK]
```

---

## 🔒 Security Posture
* **Stateless Authenticity:** We transitioned off vulnerable body payload parameters directly into a rigorous, cryptographically signed HS256 JWT infrastructure. 
* **IDOR Protection:** You cannot spoof trades, events, votes, or dating operations. IDs are strictly extrapolated out of server-side `gin.Context` wrappers.
* **CORS Proxying:** The Next.js API acts as a seamless rewrite proxy funneling traffic to Render without exposing the raw domains or facing cross-origin browser closures.

---

## 🚀 Deployment Instructions

### Backend (Render)
1. Navigate to your Render Dashboard -> "Web Service".
2. **Root Directory**: `backend`
3. **Build Command**: `go build -o server main.go`
4. **Start Command**: `./server`
5. Connect your `.env` variables (`DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET`). *(Port is handled locally by Render).*

### Frontend (Vercel)
1. Import repository to Vercel.
2. **Root Directory**: `frontend`
3. Add the following to Vercel Environment Variables:
   - `BACKEND_URL`: `https://campusex.onrender.com`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: `<Your Client ID>`
   - `GOOGLE_CLIENT_SECRET`: `<Your Secret>`
4. Deploy. The proxy mapped inside `next.config.ts` will instantly bridge global routing.
