# Architecture & Implementation Guide

This document explains the technical structure, multi-tenant workflow, and technology choices behind ShopSync.

## 1. File Structure

```
src/
├── components/          # Reusable UI components
│   ├── features/        # Feature-specific components (Pricing, ChatWidget, etc.)
│   ├── layout/          # Layout components (Navbar, Sidebar, DashboardLayout)
│   ├── organization/    # Organization switching & creation components
│   └── ui/              # Generic UI elements (Modals, Pagination, ThemeSwitcher)
├── context/             # Global State Providers
│   ├── AuthContext.jsx         # (Implicit via Supabase)
│   ├── OrganizationContext.jsx # Handles current shop/org selection
│   ├── ThemeContext.jsx        # Dark/Light mode logic
│   └── ToastContext.jsx        # Global notification system
├── lib/                 # Library configurations
│   └── supabase.js      # Supabase client initialization
├── pages/               # Route components
│   ├── admin/           # Platform Admin pages
│   ├── dashboard/       # Protected user dashboard pages (Inventory, Reports, etc.)
│   └── ...              # Public pages (Home, Login, Signup)
└── App.jsx              # Main Router configuration
```

## 2. Multi-Tenant Workflow

ShopSync is built as a **Multi-Tenant SaaS**. This means a single user can own or belong to multiple "Organizations" (Shops), and data is strictly segregated between them.

### Data Model

- **`profiles` table**: Extends the default Supabase `auth.users`. Contains user-specific details like `full_name`.
- **`organizations` table**: Represents a Shop. Contains `name`, `plan`, `address`.
- **`organization_members` table**: Links Users to Organizations. Defines their role (owner, member).

### Implementation Logic

1.  **Context (`OrganizationContext.jsx`)**:

    - When the app loads, it fetches all organizations linked to the logged-in user.
    - It maintains a `currentOrg` state.
    - All data fetching (Transactions, Inventory, etc.) **MUST** filter by `currentOrg.id`.

2.  **Row Level Security (RLS)**:
    - We use PostgreSQL RLS policies to enforce security at the database level.
    - Example Policy for `transactions`:
      ```sql
      create policy "Users can view transactions for their orgs"
      on transactions for select
      using (
        organization_id in (
          select organization_id from organization_members
          where user_id = auth.uid()
        )
      );
      ```
    - This ensures that even if the frontend code fails to filter, the database prevents unauthorized data access.

## 3. Technology Stack

### Frontend

- **React (Vite)**: Selected for speed and modern development experience.
- **Tailwind CSS**: Utility-first CSS framework for rapid, responsive UI design.
- **Framer Motion**: Used for smooth animations (page transitions, modal popups).
- **Recharts**: For rendering data visualization charts on the Reports page.
- **Lucide React**: Consistent and clean icon set.

### Backend (Supabase)

- **PostgreSQL**: The primary relational database.
- **Supabase Auth**: Handles user signup, login, and session management.
- **Supabase Storage**: Stores images for products and workers.

### Key Workflows

- **Authentication**: Users sign up via Supabase Auth. On successful signup, a trigger automatically creates a `profiles` entry.
- **Onboarding**: New users are redirected to `/onboarding` to create their first Organization.
- **Session Handling**: The app checks for an active session on boot. Public pages redirect to Dashboard if logged in. Protected pages redirect to Login if logged out.
