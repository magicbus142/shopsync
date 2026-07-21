# Architecture & Implementation Guide

This document explains the technical structure, multi-tenant workflow, and technology choices behind ShopSync (Small Business Management App).

## 1. File Structure

```
src/
├── components/          # Reusable UI components
│   ├── features/        # Feature-specific components (Pricing, ChatWidget, etc.)
│   ├── invoice/         # Invoice Generation specific components
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
│   ├── dashboard/       # Protected user dashboard pages (Inventory, Reports, InvoiceGenerator, etc.)
│   └── ...              # Public pages (Home, Login, Signup)
└── App.jsx              # Main Router configuration
```

## 2. Multi-Tenant Workflow

ShopSync is built as a **Multi-Tenant SaaS**. This means a single user can own or belong to multiple "Organizations" (Shops), and data is strictly segregated between them.

### Data Model

- **`profiles`**: User details (extends Supabase Auth).
- **`organizations`**: Represents a Shop/Business entity.
- **`organization_members`**: Links Users to Organizations with roles (owner, member).
- **`products`**: Inventory items belonging to an organization.
- **`invoices` / `transactions`**: Financial records linked to an organization.
- **`product_history`**: Audit trail for inventory changes.
- **`payment_history`**: Tracks partial payments against transactions.

### Security Logic

1.  **Context (`OrganizationContext.jsx`)**:

    - Maintains `currentOrg` state.
    - All data fetching **MUST** filter by `currentOrg.id`.

2.  **Row Level Security (RLS)**:
    - PostgreSQL RLS policies enforce isolation at the database level.
    - Users can only query data where `organization_id` matches an entry in their `organization_members` list.

## 3. Technology Stack

### Frontend

- **React (Vite)**: Core framework.
- **Tailwind CSS**: Styling.
- **Framer Motion**: Animations.
- **Recharts**: Data visualization.
- **Lucide React**: Icons.
- **html2pdf.js / html2canvas**: Client-side PDF generation for invoices.

### Backend (Supabase)

- **PostgreSQL**: Primary DB.
- **Supabase Auth**: Authentication & Session.
- **Supabase Storage**: Image hosting (logos, signatures, product images).

## 4. Key Workflows

### Authentication & Onboarding

1.  **Sign Up**: User creates account via Supabase Auth.
2.  **Profile Creation**: Trigger automatically creates `profiles` entry.
3.  **Org Creation**: User is redirected to create their first Organization (Shop).

### Invoice Generation

1.  **Editor**: Users build invoices using `InvoiceGenerator.jsx` (add items, customer, payments).
2.  **Preview**: A "Live Preview" renders the `InvoiceTemplate` component in real-time.
3.  **PDF Export**: `html2pdf.js` captures the `InvoiceTemplate` DOM and converts it to a PDF file.
4.  **Sharing**: Supports WhatsApp sharing (desktop triggers Web URL, mobile uses native share).

### Inventory Management

- **Add Product**: Creates entry in `products` table.
- **Stock Tracking**: Editing stock creates an entry in `product_history` for auditing.

### Admin Dashboard

- **Role-Based Access**: Only users with specific emails (whitelisted) can access `/admin`.
- **Metrics**: View total organizations, users, and usage stats.
