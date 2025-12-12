# Small Business Dashboard (React Migration)

This project is a migration of the "Small Business Dashboard" from Next.js to **React + Vite**.
It retains the original functionality, styling, and data integration with Supabase, tailored for a client-side architecture.

## Features

- **Authentication**: Login & Signup powered by Supabase Auth.
- **Dashboard**:
  - **Overview**: Real-time sales and inventory charts (Recharts).
  - **Inventory**: Product management with image uploads (Supabase Storage) and Excel export.
  - **Workers**: Worker profile management, salary tracking, and ledger.
  - **Transactions**: Income/Expense tracking with category and date filtering.
  - **Reports**: AI insights placeholder and transaction analysis.
  - **Settings**: Theme switching and profile management.
- **Theming**: 5 Custom Themes (Light, Dark, Midnight, Nature, Sunset).
- **Responsive**: Fully optimized for Mobile and Desktop.

## Tech Stack

- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **State**: React Context (Theme)
- **Animations**: Framer Motion & Lottie
- **Icons**: Lucide React

## Getting Started

1.  **Install Dependencies**

    ```bash
    npm install
    ```

2.  **Environment Setup**
    Create a `.env` file in the root with your Supabase credentials:

    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_key
    ```

3.  **Run Development Server**

    ```bash
    npm run dev
    ```

4.  **Build for Production**
    ```bash
    npm run build
    ```

## Important Migration Notes

- **API Routes**: Next.js API routes (`/api/*`) have been removed. Features requiring backend logic (e.g., AI analysis, Admin User management) are currently placeholders and should be implemented using **Supabase Edge Functions**.
- **Tailwind v4**: The project uses the latest Tailwind v4. Configuration is handled via CSS variables and `index.css`.
