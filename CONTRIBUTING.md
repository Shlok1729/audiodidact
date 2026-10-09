# Contributing to Audiodidact

Thank you for your interest in contributing to Audiodidact! Our mission is to make open-source repositories accessible to blind and visually impaired developers.

## Hacktoberfest & Open Source Contributions

We welcome contributions across all areas:
- New diagram parser adapters (Mermaid, PlantUML, sequence diagrams).
- Accessibility audits, ARIA refinements, and screen-reader usability testing.
- UI enhancements for keyboard navigation and voice command accuracy.
- Testing fixtures for real-world architecture diagrams.

## Development Setup

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Run the development server in mock mode:
   ```bash
   npm run dev
   ```
4. Verify tests and build:
   ```bash
   npm run build
   ```

## Accessibility Rule

Every new UI component or interactive flow MUST be fully operable via keyboard only, declare appropriate ARIA roles and landmarks, and maintain WCAG AA contrast.
