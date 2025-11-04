# WOU Attendance QR System

A QR code-based attendance management system built with Next.js, Prisma, and PostgreSQL for tracking student attendance in classes.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Scripts](#scripts)

## Features

- QR code generation for attendance sessions
- Real-time attendance tracking
- Admin authentication system
- Session management (open/close sessions)
- Student attendance submission
- Semester and section management
- Period-based scheduling
- IP and device tracking for submissions
- Report generation (CSV/PDF)
- Idempotency key support

## Tech Stack

- **Frontend**: Next.js 15.5, React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: Radix UI, Tailwind CSS
- **Authentication**: bcryptjs for password hashing
- **QR Code**: react-qr-code
- **Form Validation**: React Hook Form, Zod
- **Date/Time**: Luxon

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm**, **yarn**, **pnpm**, or **bun**
- **PostgreSQL** (v12 or higher)
- **Git**

## Installation

1. Clone the repository:

```bash
git clone https://github.com/sobit-woxsen/wou-attendance-qr.git
cd wou-attendance-qr
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/attendance_db?schema=public"

# Passkey (for faculty access)
PASSKEY_HASH="your-bcrypt-hashed-passkey"
PASSKEY_VERSION="1"

# Admin User (optional - for seeding)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD_HASH="your-bcrypt-hashed-password"
ADMIN_PASSWORD_VERSION="1"
```

### Generating Hashes

To generate bcrypt hashes for passwords and passkeys, you can use the following Node.js script:

```javascript
const bcrypt = require('bcryptjs');

const password = 'your-password-here';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

Or use an online bcrypt generator.

## Database Setup

1. Create a PostgreSQL database:

```bash
createdb attendance_db
# or via psql
psql -U postgres
CREATE DATABASE attendance_db;
```

2. Generate Prisma client:

```bash
npm run prisma:generate
```

3. Run database migrations:

```bash
npm run prisma:migrate
```

This will create all the necessary tables in your database.

4. (Optional) Seed the database with initial data:

If you want to seed periods, semesters, sections, passkey, and admin user:

- Uncomment the code in `prisma/seed.ts`
- Ensure your `.env` file has the required variables (`PASSKEY_HASH`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`)
- Run the seed command:

```bash
npm run seed
```

The default seed includes:
- 6 periods (P1-P6) with timings
- Semesters 1, 2, 4, and 6 with sections (Leopards, Rhinos, Wolves, Whales, Tigers, Panthers)
- Initial passkey and admin user (if configured)

## Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

## Project Structure

```
wou-attendance-qr/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding script
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home page
│   ├── components/        # React components
│   └── lib/               # Utility functions
├── public/                # Static assets
├── .env                   # Environment variables (create this)
├── package.json
├── tsconfig.json
└── README.md
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run seed` | Seed database with initial data |

## Usage

1. **Admin Login**: Access the admin panel to manage sessions
2. **Create Session**: Create a new attendance session for a specific period, section, and course
3. **QR Code**: A unique QR code will be generated for the session
4. **Student Scan**: Students scan the QR code to mark their attendance
5. **Close Session**: Admin can close the session when the period ends
6. **Reports**: Generate attendance reports in CSV or PDF format

## Database Models

- **Semester**: Academic semesters
- **Section**: Class sections within semesters
- **Period**: Time slots for classes
- **Session**: Individual attendance sessions
- **AttendanceSubmission**: Student attendance records
- **AdminUser**: Admin users for system management
- **Passkey**: Faculty access keys
- **SessionLog**: Historical session data
- **GeneratedReport**: Generated attendance reports
- **IdempotencyKey**: Prevents duplicate session creation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the GitHub repository.
