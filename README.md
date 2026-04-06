# EpiskopOS
## Integrated Lighting and Event Management System

> A web-based management platform for small venues — built for churches, community halls, and similar organisations to plan events, coordinate volunteers, and streamline team communication.

*Episkopos* = Greek for "overseer"

---

## Project Overview

Small venues like churches and community halls typically rely on separate, disconnected tools to manage events, lighting, and sound. This fragmentation leads to miscommunication and errors during live services. ILEMS addresses this by providing a unified system that:

- Plans services and events
- Assigns volunteers to roles
- Enables live messaging and team updates
- (Roadmap) Controls and optimises lighting

This is a final-year Computer Science project (CS3IP) at Aston University, supervised by Professor Tony Dodd.

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Frontend    | React + Vite + Tailwind CSS       |
| Backend     | Node.js + Express (MVC)           |
| Real-time   | Socket.IO                         |
| Database    | PostgreSQL (via Supabase)         |
| Auth        | JWT (stored in localStorage)      |
| Dev Env     | GitHub Codespaces                 |

---

## User Roles

| Role              | Description                            |
|-------------------|----------------------------------------|
| `admin`           | Full access — event planning, volunteer management, messaging |
| `volunteer`       | View assignments and service schedule  |
| `lighting`        | Lighting team                          |
| `sound`           | Sound team                             |
| `media`           | Media/projection team                  |
| `instrumentalists`| Music team                             |

> Admins are registered via an invite-link system.

---

## Roadmap

| Period           | Goal                                              |
|------------------|---------------------------------------------------|
| Oct–Nov 2025     | Research, requirements gathering                  |
| Nov–Dec 2025     | System architecture design, mockups (Figma)       |
| Dec–Jan 2026     | Dev environment + event planning module           |
| Jan–Feb 2026     | Homepage, auth, live event control UI             |
| March 2026       | User research & evaluation                        |
| April 2026       | Final report, documentation, presentation         |

---

## Academic Context

| Field       | Detail                                      |
|-------------|---------------------------------------------|
| Institution | Aston University                            |
| Programme   | BSc Computer Science                        |
| Module      | CS3IP — Final Year Project                  |
| Supervisor  | Professor Tony Dodd                         |
| Student     | Ndumiso Mbangeleli (220216407)              |