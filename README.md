# DataBase Frontend

A React TypeScript frontend for the DataBase data management and analysis system.

## Features

- **File Upload**: Drag & drop CSV file upload with visual feedback
- **Table Selection**: Interactive table selection with search and bulk actions
- **Run Management**: Load previous analysis runs from history
- **Workflow Progress**: Visual progress indicator for the analysis workflow
- **Responsive Design**: Modern UI built with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API running on http://localhost:8000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Backend Integration

The frontend expects the FastAPI backend to be running on `http://localhost:8000`. Make sure to start the backend server before using the frontend.

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx      # Top navigation bar
│   ├── Sidebar.tsx     # Left sidebar with run history
│   ├── WorkflowProgress.tsx  # Progress indicator
│   ├── UploadSection.tsx     # File upload area
│   └── TableSelection.tsx    # Table selection interface
├── services/           # API services
│   └── api.ts         # Backend API integration
└── App.tsx            # Main application component
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

## API Endpoints Used

- `POST /upload-tables` - Upload CSV files
- `GET /get-runs` - Get list of analysis runs
- `POST /load-run/{run_id}` - Load a specific run
- `GET /get-tables/{run_id}` - Get tables for a run (to be implemented)

## Styling

The application uses Tailwind CSS for styling, providing a modern and responsive design that matches the original UI mockup.