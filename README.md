# ShopSync - Small Business Intelligence Platform

ShopSync is a modern, AI-powered business management dashboard designed for small shop owners in India. It helps manage inventory, track workers, record transactions, and generate smart reports.

## Features

- **Multi-Tenant Dashboard**: Manage multiple shops or organizations under a single user account.
- **Inventory Management**: Track stock levels, low stock alerts, and product history.
- **Worker Management**: Manage staff profiles, track salaries, and record payments.
- **Transaction Recording**: Digital ledger for Income and Expenses.
- **Smart Reports**: AI-powered insights and visual analytics of your business performance.
- **Invoice Generator**: Create professional PDF invoices with your shop's branding.
- **Platform Admin**: Dedicated dashboard for platform administrators to manage plans and whitelist users.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: React Context API
- **Visualization**: Recharts
- **Icons**: Lucide React

## Getting Started

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Setup**:
    Create a `.env` file with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Project Structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed breakdown of the code structure and architectural decisions.
