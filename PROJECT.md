# Shutter Island Software System - Project Report

This is a Cursor-focused Markdown version of the Shutter Island report. It keeps the report content needed for implementation and review while removing non-useful PDF material: the cover, approval/signature page, acknowledgments, generated table of contents, list of figures, list of tables, final index, rendered page images, page headers/footers, page numbers, and figure/table numbering artifacts.

Source report: `Shutter_Island.pdf`  
Project: Shutter Island - An Indoor Playground Game Software System  
Team: Atlas Systems Group  
Course context: CSC490 Software Engineering, Phase II

---


# Current Repository Implementation Addendum

This section records the current implementation state of the repository. It complements the
original SRS content below, which remains the baseline product specification. When the SRS
and the implementation differ, this addendum describes the code that currently exists and
the work that is still pending.

## Current Implementation Snapshot

The repository is organized as a three-part web application:

- `backend/`: Node.js 22+ and Express API server using ES modules.
- `frontend/shutterisland/`: Vite React application using React 19, React Router, Recharts,
  Tailwind, CSS modules, and local fallback data.
- `database/`: MySQL 8 schema and seed data loaded by running `schema.sql` before
  `data.sql`.

The backend currently includes implemented logic for authentication and access control,
session administration, game management, live session metrics, monitoring, reporting,
audit logging, and server-sent events for admin refresh notifications. The frontend includes
the public home page, sessions page, admin dashboard, login/register screens, and session
details view. Several frontend screens intentionally use fallback mock data when the API is
unavailable.

## Actual Backend Stack and Scripts

The backend package is `shutterisland-backend`.

- Runtime: Node.js `>=22`.
- Server framework: Express 4.
- Database client: `mysql2/promise`.
- Auth support: custom HMAC-signed bearer token helpers in `auth.tokens.js`.
- Password verification: `bcryptjs`, plus legacy `scrypt` and SHA-256 hash support.
- Environment loading: `dotenv`.
- Development runner: `nodemon`.
- Main scripts: `npm run dev`, `npm start`, `npm test`, `npm run check`, and
  `npm run db:test`, `npm run db:validate`, `npm run db:backup`, and
  `npm run db:restore`.
- Default backend URL: `http://localhost:4000`.
- Default API prefix: `/api`.
- Local frontend CORS origin: `http://localhost:5173`.

Runtime configuration is read from `backend/.env` using these keys: `NODE_ENV`, `PORT`,
`API_PREFIX`, `AUTH_TOKEN_SECRET`, `AUTH_TOKEN_TTL_SECONDS`, `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_SSL`.

## Actual Frontend Stack and Scripts

The frontend package is `shutterisland`.

- Runtime/build tool: Vite.
- Framework: React 19.
- Routing: currently resolved manually from `window.location.pathname` in `App.jsx`;
  `react-router-dom` is installed but not the primary routing mechanism.
- Charts: Recharts.
- Styling: CSS modules, global CSS, variables CSS, Tailwind 4, and page-level inline styles
  in some larger pages.
- Main scripts: `npm run dev`, `npm run build`, `npm run lint`, and `npm run preview`.
- Testing scripts: `npm test`, `npm run test:watch`, `npm run e2e`, and
  `npm run e2e:headed`.
- API base variables used by the frontend: `VITE_API_URL` and `VITE_API_BASE_URL`.

Frontend pages currently implemented:

- `/`: `HomePage.jsx`, public marketing/live-session landing page using
  `homepageData.json` and local timers.
- `/sessions`: `SessionsPage.jsx`, session listing, filtering, fallback mock sessions, and
  create-session modal.
- `/sessions/:id`: `SessionDetailsPage.jsx`, API-backed session detail view with realtime
  refresh support and explicit offline messaging.
- `/dashboard`: `AdminDashboard.jsx`, admin overview, charts, session actions, reports,
  CSV/HTML export, fallback data, and realtime refresh support.
- `/login`: `LoginPage.jsx`, connected to `POST /api/auth/staff/login` and stores bearer
  token in local storage.
- `/register`: `RegisterPage.jsx`, informational account-request screen; self-service account
  creation is not yet enabled.

## Actual API Routes

All module routers are mounted under `env.apiPrefix`, which defaults to `/api`.

Health:

- `GET /health`: checks the API process and database connection.

Authentication and access control:

- `POST /api/auth/staff/login`: authenticates administrator or staff credentials.
- `GET /api/auth/staff/me`: returns authenticated staff profile.
- `GET /api/auth/staff/access-control`: returns authenticated staff role and permissions.
- `POST /api/auth/viewer/login`: authenticates a viewer using a viewer access key.
- `GET /api/auth/viewer/me`: returns authenticated viewer profile.
- `GET /api/auth/viewer/access-control`: returns authenticated viewer role and permissions.
- `GET /api/auth/access-control/roles`: returns role and permission definitions.

Session administration:

- `GET /api/session-administration/sessions`: lists sessions with optional month/status
  filters.
- `POST /api/session-administration/sessions`: creates a game session.
- `PATCH /api/session-administration/sessions/:sessionId`: updates session code and player
  bounds.
- `DELETE /api/session-administration/sessions/:sessionId`: deletes sessions only when
  their state allows removal.
- `POST /api/session-administration/sessions/:sessionId/pause`: moves an active session to
  paused.
- `POST /api/session-administration/sessions/:sessionId/resume`: moves a lobby or paused
  session to active.
- `POST /api/session-administration/sessions/:sessionId/terminate`: cancels a lobby,
  active, or paused session.
- `GET /api/session-administration/sessions/:sessionId`: returns a session by numeric ID.
- `GET /api/session-administration/sessions/:sessionId/participants`: lists session
  participants.
- `POST /api/session-administration/sessions/:sessionId/participants`: registers participant
  by existing `playerId` or new `displayName`.
- `POST /api/session-administration/sessions/:sessionId/participants/:playerId/check-in`:
  checks in a registered participant.

Game management:

- `GET /api/game-management/sessions/:sessionId/timer`
- `POST /api/game-management/sessions/:sessionId/timer/start`
- `POST /api/game-management/sessions/:sessionId/timer/pause`
- `POST /api/game-management/sessions/:sessionId/timer/resume`
- `POST /api/game-management/sessions/:sessionId/timer/stop`
- `GET /api/game-management/sessions/:sessionId/challenges/sequence`
- `POST /api/game-management/sessions/:sessionId/challenges/trigger`
- `GET /api/game-management/sessions/:sessionId/levels/progression`
- `POST /api/game-management/sessions/:sessionId/levels/progress`
- `GET /api/game-management/sessions/:sessionId/events`
- `POST /api/game-management/sessions/:sessionId/events`
- `POST /api/game-management/sessions/:sessionId/participants/actions`
- `GET /api/game-management/sessions/:sessionId/eliminations`
- `POST /api/game-management/sessions/:sessionId/eliminations`
- `GET /api/game-management/sessions/:sessionId/performance/flow`
- `GET /api/game-management/sessions/:sessionId/finish-conditions`
- `POST /api/game-management/sessions/:sessionId/finish-conditions/detect`
- `GET /api/game-management/sessions/:sessionId/final-rankings`
- `POST /api/game-management/sessions/:sessionId/final-rankings/assign`
- `GET /api/game-management/sessions/:sessionId/state/sync`
- `GET /api/arena/current`
- `GET /api/arena/current/markers`
- `GET /api/arena/current/obstacles`

Live streaming, payment, and betting metrics:

- `GET /api/sessions/:sessionIdentifier/live`: returns live session metrics, participants,
  betting pool, odds, stream access counts, MVP candidate, and top bet.
- `POST /api/sessions/:sessionIdentifier/viewer-access-keys`: issues viewer access key.
- `POST /api/sessions/:sessionIdentifier/viewer-access-keys/:accessId/revoke`: revokes
  viewer access key.
- `POST /api/sessions/:sessionIdentifier/bets`: places a viewer bet.
- `POST /api/sessions/:sessionIdentifier/bets/settle`: settles pending bets.
- `POST /api/sessions/:sessionIdentifier/bets/cancel-pending`: cancels pending bets.

Monitoring and reporting:

- `GET /api/admin/stream`: opens a server-sent events stream for admin UI refreshes.
- `GET /api/sessions/:sessionIdentifier/eliminations`
- `GET /api/sessions/:sessionIdentifier/positions/latest`
- `GET /api/admin/dashboard/overview`
- `GET /api/admin/dashboard/sessions`
- `GET /api/admin/dashboard/participants`
- `GET /api/admin/reports/session-performance`
- `GET /api/admin/reports/participant-summary`
- `POST /api/admin/logs/audit`
- `GET /api/admin/logs/audit`
- `GET /api/admin/reports/session-events`

## Implemented Requirement Coverage

Implemented or partially implemented:

- Staff and viewer authentication with bearer tokens.
- Role and permission definitions for Administrator, Staff, and Viewer.
- Staff middleware and RBAC enforcement for game-management read/write routes.
- Session creation, update, deletion, pause, resume, terminate, and lookup by ID.
- Session list filtering, participant registration, participant listing, and check-in.
- Game timers with start, pause, resume, stop, elapsed time, and remaining time.
- Challenge sequence lookup and challenge triggering.
- Room progression with mandatory challenge checks and elimination requirements.
- Participant action logging and elimination recording.
- Finish-condition detection and final-ranking assignment.
- Performance flow metrics derived from rooms, challenges, participants, and events.
- Monitoring dashboard metrics, participant lists, session reports, audit logs, and event
  reports.
- Live-session metric aggregation for participant state, odds, pool, stream access, MVP, and
  top bet.
- Viewer access key issuance/revocation and bet placement/settlement/cancellation endpoints.
- Server-sent admin updates through `/api/admin/stream`.
- Database health check through `/health`.
- Basic backend auth tests covering token signing, validation, role permissions, protected
  routes, and malformed requests.

Specified but not fully implemented:

- Real external payment gateway integration.
- Real paywall payment confirmation before issuing viewer access keys.
- Payment gateway-backed confirmation and payout/refund execution (current settlement and
  cancellation are API-level only).
- Real live video streaming or encryption delivery. The database stores stream metadata, but
  no media pipeline is implemented.
- Scheduled automatic backups and orchestrated restore automation (manual backup/restore
  scripts now exist in backend scripts).
- Account registration workflow for staff or viewers.
- Full role model hardening for all read endpoints where viewer/shared access is still under
  policy review.
- Real intake terminal and separate staff console surfaces.
- Arena geometry endpoints from `docs/SRS/arena-data-contract.md`, including
  `/api/arena/current`, `/api/arena/current/markers`, and `/api/arena/current/obstacles`.

## Database Source of Truth

The active database source of truth is `database/schema.sql`. It creates the `shutterisland`
database and these main tables:

- `manager`
- `player`
- `game_session`
- `session_player`
- `room`
- `session_room`
- `session_room_player`
- `elimination`
- `challenge`
- `room_challenge`
- `arena_zone`
- `arena_marker`
- `arena_obstacle`
- `environment_event`
- `live_stream`
- `viewer_access_key`
- `audit_log`
- `bet`

Important schema details:

- `game_session.max_players` is constrained to the range `1` through `7`.
- `game_session.status` values are `Lobby`, `Active`, `Paused`, `Finished`, and
  `Cancelled`.
- `game_session` contains timer columns: `timer_status`, `timer_duration_seconds`,
  `timer_started_at`, `timer_paused_at`, and `timer_elapsed_before_pause_seconds`.
- `session_room.status` values are `Pending`, `Active`, `Completed`, `Failed`, and
  `Locked`.
- `session_room.min_eliminations_to_unlock` must be at least `1`.
- `elimination` enforces one elimination per `(session_id, player_id)`.
- `environment_event.payload_json` stores structured event details as JSON.
- `audit_log.details_json` stores structured audit details as JSON.
- `live_stream.stream_status` values are `Offline`, `Live`, `Paused`, and `Ended`.
- `viewer_access_key.access_status` values are `Active`, `Revoked`, and `Expired`.
- `bet` stores `predicted_value`, `actual_value`, and `bet_status`; current code does not
  use the SRS names `PredictedOutcome`, `ActualOutcome`, or `Status`.

The active seed data source is `database/data.sql`. It loads managers, players, rooms,
challenges, game sessions, room/player assignments, eliminations, environment events,
live streams, viewer access keys, audit logs, and bets.

## Known Documentation Drift

Several supporting docs and TODO notes are older than the implementation:

- Supporting README files have been updated to reflect current implementation status and
  script usage.
- `docs/SRS/arena-data-contract.md` describes an arena-oriented contract using entities such
  as `arena_session`, `session_participant`, `elimination_event`, and `position_snapshot`,
  while the active schema uses `game_session`, `session_player`, `elimination`, and derived
  position data from `session_room_player`.
- Some frontend comments in `SessionsPage.jsx` describe copied-in service and hook files
  that are actually embedded in the single page component.

## Development Guidance

Use these conventions when extending the project:

- Treat `database/schema.sql` and `database/data.sql` as the database source of truth unless
  migration files are introduced later.
- Keep backend routes under `backend/src/modules/<ModuleName>` and mount module routers
  from `backend/src/routes/api.routes.js`.
- Reuse existing helpers for environment config, database pooling, auth tokens, auth
  middleware, RBAC permissions, async route behavior, and SSE updates.
- Prefer database-backed services over frontend-only mock data when implementing shipped
  workflows.
- Preserve the existing role names and status strings unless schema migrations and frontend
  mappings are updated together.
- When adding protected write operations, apply staff authentication and permission checks
  consistently with the game-management routes.
- Keep frontend API calls aligned with the `/api` prefix and the `VITE_API_URL` or
  `VITE_API_BASE_URL` environment variables.
- Avoid introducing new architectural patterns unless they replace an explicitly stale
  placeholder or reduce duplicated page-local logic.


# I. Preface


This document presents the Software Requirements Specification (SRS) for the Shutter
Island project. The system is designed to manage and operate a controlled, horror-themed
immersive group challenge environment centered on structured survival-based sessions.
This document formally defines the services provided to users, the functional and non-
functional requirements of the system, and the operational constraints necessary for the
structured execution of challenge sessions.
The intended readership includes system developers, software engineers, project managers,
instructors, evaluators, operational managers, and other technical stakeholders involved in
the analysis, development, implementation, and assessment of the system. The document
establishes the baseline requirements for session booking, participant management, session
control, scoring mechanisms, monitoring processes, and administrative oversight.
This document represents Version 1.0 of the Software Requirements Specification and cor-
responds to Phase II of the Software Engineering Project. It serves as the initial formal
specification of the system before implementation. Future versions of this document may
include refinements to system functionality, adjustments to challenge logic, expanded an-
alytics capabilities, enhanced monitoring requirements, and clarifications resulting from
testing or design evolution. All revisions will be documented to maintain version control
and requirement traceability throughout the project lifecycle.

# II. Introduction


They arrive without knowing what awaits them. A private island owned by an exclusive
consortium of powerful, wealthy individuals. A sealed indoor playground built for a single
purpose. The doors close behind them before the rules are fully understood. Only then are
they told the truth: they have been placed inside a survival arena, and only one of them
has a chance to make it out, with wealth, freedom, and a second chance. Cameras watch
from every angle as tension begins to rise. Each room tests endurance, fear, and instincts.
Countdowns echo through the walls, environments shift without warning, and with every
completed challenge, one less participant remains. Doubt spreads quickly; survival may
require cooperation, but trust becomes fragile as alliances form and collapse under pressure.
Behind the scenes, the island’s owners observe the unfolding events, and the CEO of the
commissioned software company is among those involved in overseeing the playground’s
operations. The rules are simple: only one survives. But the playground was never built
for victory. In the final stage, when the last remaining contender believes escape is finally
within reach, the system reveals its true design: there was never meant to be a winner.
Location-based entertainment venues, such as indoor playgrounds, trampoline parks, and
family entertainment centers, face a common challenge: their primary audience is chil-
dren. Adults accompanying children often have nothing engaging to do, representing
an untapped market opportunity. Furthermore, existing adult-focused attractions (escape
rooms, laser tag, axe throwing) either require extensive physical modifications, expensive
equipment, or offer limited replayability. There is a growing demand for social, physical,
technology-enhanced experiences that appeal to adults aged 18–40. The Shutter Island
concept was commissioned by private investors to address precisely this gap, generating
recurring revenue through session bookings, live-stream viewer access, and a regulated
wagering subsystem. The complexity of operating such an experience makes a dedicated
software system operationally essential. Atlas Systems Group has been commissioned to
design and deliver this system.
The proposed Shutter Island System is designed to coordinate session scheduling, partic-
ipant registration, real-time gameplay control, elimination tracking, live monitoring, and
controlled viewer access. The system also integrates a wagering subsystem that allows

authorized viewers to place predefined bets on participant performance metrics, such as
survival duration or elimination order, without influencing the outcome of the session. The
system operates using a client–server architecture to ensure synchronized state manage-
ment across all active sessions. The system provides secure administrative controls, enables
live-stream broadcasting, and supports structured data logging to support reporting and ana-
lytics functions. Strict role-based access control ensures separation between administrators,
operational staff, participants, and viewers.
This document provides a comprehensive specification of the functional and non-functional
requirements necessary to implement the system. It defines session management processes,
challenge execution logic, monitoring mechanisms, security controls, data management
policies, scalability expectations, and integration constraints. The objective is to establish
a structured, secure, and scalable software architecture capable of supporting concurrent
immersive sessions while maintaining operational integrity and data protection.
This project applies IEEE documentation standards and structured development method-
ologies to demonstrate requirement specification, architectural planning, concurrency man-
agement, and modular system design. The resulting system reflects scalable, maintainable,
and professionally documented software engineering practices.

# III. Glossary


Access Key: A unique credential issued to a viewer after successful paywall authorization,
granting entry to the live-streaming interface for a specific session.
Administrator: A privileged system operator with full control over session management,
participant oversight, real-time monitoring, emergency override execution, and report gen-
eration.
API: Application Programming Interface used to enable integration and communication
between the system and external software components.
Atomic Transaction: A database operation in which all steps either complete successfully
together or are fully rolled back, ensuring no partial state is persisted.
Audit Log: A persistent, timestamped record of all administrative actions, session control
events, and betting activity stored for traceability and compliance review.
Authentication: The process of verifying the identity of a user or system entity.
Authorization: The process of determining and enforcing access rights for authenticated
users.
Bet: A sum of money or valued item placed on the outcome of an unpredictable event.
Bet Management Module: A subsystem responsible for recording, validating, and resolv-
ing viewer bets based on predefined session outcomes. It is strictly separated from the game
engine to prevent interference with session execution.
Booking Identifier: A unique system-generated code assigned to each confirmed session
booking to support tracking, auditing, and cancellation processing.
Business Logic Layer: The architectural layer that implements and enforces all system
rules, including session management, elimination validation, bet validation, and payment
confirmation, before any database commit is executed.
Cancellation Policy: A configurable rule set that governs the conditions and procedures
under which a session booking may be cancelled or rescheduled, including automatic
availability updates.

Capacity Limit: The maximum number of participants permitted in a single session as
defined by system configuration.
Challenge: A reusable task or scenario template assigned to one or more rooms within a
session, used to test participant endurance, cooperation, or decision-making.
Challenge Session: A scheduled, system-controlled immersive group experience involving
structured survival-based scenarios.
Client Terminals: Devices used by administrators, staff, participants, or viewers to access
the system interface.
Client–Server Architecture: A distributed computing model in which client devices
request services or data from a centralized server that processes requests and maintains
system state.
Concurrency Control: A set of mechanisms, including row-level locking and atomic
transaction management, used to prevent data conflicts when multiple sessions or users
interact with the system simultaneously.
Controller: In the MVC pattern, the layer responsible for handling user requests, coordi-
nating business logic execution, managing database transactions, and generating responses
to the View layer.
Data Layer: The architectural tier responsible for all persistent storage, retrieval, and
integrity enforcement, implemented as a MySQL relational database serving as the single
source of truth for all system state.
Data Logging: The systematic recording of system events and participant actions for
monitoring, auditing, and analysis purposes.
Deployment Architecture: The physical distribution of system components across infras-
tructure, including client devices, the application server, and the MySQL database server,
connected over HTTPS.
Elimination: A system-defined in-game state indicating that a participant can no longer
actively compete in the session. Each participant may be eliminated at most once per
session.
Emergency Override: An administrative mechanism that allows authorized personnel to
immediately terminate or unlock active sessions.
Encrypted Network: A secure communication layer that protects transmitted session data
from unauthorized access through encryption protocols.
Environment Event: A system- or manager-triggered occurrence during gameplay, such
as a room state change or a timed hazard, stored with a structured payload and the identity

of the triggering actor.
Foreign Key: A database constraint that enforces a referential link between two tables,
preventing orphaned or inconsistent records.
Game Engine: The core software component responsible for managing session logic,
timing mechanisms, scoring calculations, event triggers, and progression control.
Game Session: A complete game match in which a group of participants progresses through
a sequence of rooms and challenges. Its lifecycle states are Lobby, Active, Paused, Finished,
and Cancelled.
Horizontal Scaling: Adding more servers or computing resources to handle increased load
while maintaining system performance.
HTTPS: Hypertext Transfer Protocol Secure; the encrypted communication protocol used
for all data transmission between client interfaces and the backend server.
Layered Architecture: An architectural pattern that separates the system into four distinct
tiers: Presentation, Authentication and Authorization, Business Logic, and Data; so that
each layer communicates only with adjacent layers.
Live Stream: A database entity that stores streaming metadata for a session, including
stream status, URL, encryption mode, and timing information. Each game session may
have at most one active live stream.
Live-Streaming Module: A system component responsible for transmitting real-time
audiovisual session data to authorized external viewers through a secure network channel.
Live-streaming: The process of transmitting real-time audiovisual session data from the
system to authorized viewers.
Manager: A system entity representing an administrator or moderator responsible for
creating sessions, managing participants, and overseeing system operations. Managers
authenticate with secure credentials and are subject to role-based access control.
Model: In the MVC pattern, the layer that represents core domain entities, enforces data
integrity constraints, and manages the state of objects such as GameSession, Player, Bet,
and AuditLog.
MVC (Model–View–Controller): An architectural pattern that separates domain logic
(Model), user interface rendering (View), and request handling (Controller) into three
distinct layers to improve modularity and maintainability.
MySQL: The relational database management system used as the primary data store for all
session state, participant records, betting activity, and audit data.
Observer: An authorized user who can view sessions and place bets without interacting

with participants.
Optional Hardware Enhancements: Additional devices, such as sensors or AR/VR dis-
plays, used to improve system interactivity and user experience.
Participant: A registered individual who actively takes part in a challenge session. Par-
ticipants are created and managed by administrators and do not hold independent login
credentials.
Paywall: An access control mechanism that requires a viewer to complete payment through
the integrated payment gateway before an access key is issued and live-stream entry is
permitted.
Payment Gateway: An external service integrated with the system to process and confirm
financial transactions related to session bookings and bet placements.
Performance Metrics: Quantitative measurements of participant and group activity during
a session, including elimination order, room progression timing, and survival duration,
derived from stored logs.
Player: A database entity representing a session participant, identified by a unique PlayerID
and tracked for survival status, elimination events, and final rank within a game session.
Presentation Layer: The architectural tier responsible for all user-facing interface elements,
role-based dashboard rendering, and real-time display updates delivered via WebSocket.
Primary Key: A unique database identifier assigned to every record in a table, ensuring that
each entity is individually addressable and that inter-table relationships are unambiguous.
RBAC (Role-Based Access Control): A security mechanism that restricts system interface
elements and operations based on the authenticated user’s assigned role (Administrator,
Staff, or Viewer).
Real-Time Monitoring: Continuous observation and tracking of session activity and par-
ticipant progression as events occur.
Refund: The automatic reversal of a payment associated with a Pending bet when the related
game session is cancelled, terminated, or expires without reaching a settleable outcome.
Reporting and Analytics Module: A subsystem responsible for generating session out-
come reports, group performance metrics, elimination statistics, bet outcome summaries,
and administrative audit reports derived from stored logs.
Room: A reusable level template assigned to a game session, characterized by a diffi-
culty level, sequence order, time limit, and elimination rule. Rooms are instantiated as
SessionRoom records during a session.
Room Unlocking: The process by which the system transitions the next sequential room

to an Active state once the minimum required number of eliminations has been recorded in
the current room.
Server: A computer or system that hosts the application backend, manages sessions,
processes game logic, and handles observer connections.
Service-Oriented Architecture: An architectural approach in which major system func-
tionalities, such as authentication, session management, and betting, are implemented as
independent modular services that communicate through defined interfaces.
Session Booking: The confirmed reservation of a game session time slot, finalized only
after payment confirmation is received through the integrated payment gateway.
Session Duration: The total allocated time for a single challenge session as defined by
system configuration parameters.
Session State: The current lifecycle status of a game session, represented by one of the
following values: Lobby, Active, Paused, Finished, or Cancelled.
Session Token: A credential issued to an authenticated user after login, validated on
every subsequent request to maintain continuous authorization without requiring repeated
credential entry.
SessionPlayer: A database entity that associates a player with a specific game session and
tracks their overall survival status, elimination timestamp, and final rank.
SessionRoom: A database entity representing a room instance within a specific game
session, tracking its activation status, timing, and the minimum number of eliminations
required to unlock the next room.
SessionRoomPlayer: A database entity that records which players entered a given room
within a session and tracks their per-room outcome as Active, EliminatedInThisRoom, or
SurvivedRoom.
Staff: An operational user role with limited system access, permitted to assist with partici-
pant check-in, session activation, and safety monitoring.
Themed Environment: A controlled and isolated challenge setting designed to simu-
late survival-based scenarios through environmental constraints, progression control, and
psychological elements.
Trust Trial: A cooperative challenge requiring coordinated interaction between partici-
pants.
Unique Tracking Identifier: A system-assigned identifier given to each participant at regis-
tration to support accurate identification, status monitoring, and activity logging throughout
a session.

Vertical Scaling: Increasing the processing power, memory, or storage capacity of an
existing server to accommodate higher load, as distinct from horizontal scaling which adds
additional servers.
View: In the MVC pattern, the user-facing interface layer that is dynamically rendered based
on the authenticated user’s role, ensuring each user type sees only the elements relevant to
their permissions.
Viewer: An authorized external user permitted to monitor live sessions and place bets
without directly interacting with active participants.
ViewerAccessKey: A database entity storing the unique access key issued to a specific
viewer for a specific live stream, along with its status (Active, Revoked, or Expired) and
usage timestamps.
Wagering Subsystem: The integrated component of the system that allows authorized
viewers to place bets on predefined session outcomes, validates payments through the
payment gateway, settles results upon session completion, and generates betting reports for
administrative review.
WebSocket: A communication protocol enabling persistent, bidirectional connections
between the server and client interfaces, used to deliver real-time session state updates to
monitoring dashboards at intervals not exceeding five seconds.

# IV. User Requirements Definition


## IV.1 Session Administration Requirements

UR-SES-1 The system shall allow administrators to view and manage active sessions through
    a user interface.

UR-SES-2 The system shall allow administrators to create, modify, or close session time slots.

UR-SES-3 The system shall allow administrators to register participant information prior
    to session initiation.

UR-SES-4 The system shall assign a unique tracking identifier to each participant during registration.

UR-SES-5 The system shall allow administrators to verify that all selected participants are present
    before initiating a session.

UR-SES-6 The system shall initiate a session timer when a game session begins.

UR-SES-7 The system shall allow administrators to pause, resume, or terminate an active session.

UR-SES-8 The system shall support multiple concurrent sessions without data conflict.


## IV.2 Game Monitoring Requirements

UR-GAME-1 The system shall visually indicate the elimination status of participants dur-
    ing a session.

UR-GAME-2 The system shall display real-time session status on an administrator mon-
    itoring dashboard.

UR-GAME-3 The system shall calculate and display group performance metrics at ses-
    sion completion.

UR-GAME-4 The system shall maintain individual participant performance records for
    internal analytics.

UR-GAME-5 The system shall store session history for reporting and analytical purposes.


## IV.3 Authentication and Access Control Requirements

UR-SEC-1 The system shall authenticate staff users before granting system access.

UR-SEC-2 The system shall restrict system access based on assigned user roles.

UR-SEC-3 The system shall authenticate viewer accounts before granting access to view-
    ing services.


## IV.4 Live Streaming Requirements

UR-STR-1 The system shall provide authorized viewers with access to a live-streaming interface
    for active sessions.

UR-STR-2 The system shall encrypt live-streaming data to prevent unauthorized access.

UR-STR-3 The system shall record viewer access activity for monitoring and auditing
    purposes.


## IV.5 Payment and Betting Requirements

UR-BET-1 The system shall allow authorized viewers to place bets on session partici-
    pants.

UR-BET-2 The system shall validate bet placement only after successful payment authorization
    from the integrated payment gateway.

UR-BET-3 The system shall record bet details including viewer identity, selected out-
    come, and timestamp.

UR-BET-4 The system shall automatically evaluate session outcomes to determine bet
    results.

UR-BET-5 The system shall calculate bet payouts based on predefined system rules.

UR-BET-6 The system shall update viewer accounts based on bet results.

UR-BET-7 The system shall maintain a complete bet history for reporting and auditing
    purposes.

UR-BET-8 The system shall integrate with an external payment processing system for
    transaction handling.

# V. System Architecture


## V.1 System Context
The system context diagram illustrates the external entities that interact with the Shutter
Island system and defines the system boundary. It provides a high-level overview of how
users and external services communicate with the system.
The primary external actors include administrators, staff members, participants, and view-
ers. Additionally, the system interacts with an external payment gateway responsible for
processing betting transactions. These entities communicate with the backend application
server, which processes requests and interacts with the system database.
This model helps define the operational environment of the system and clarifies which
components are part of the system and which exist outside its boundaries.


**Diagram:** System Context Diagram


## V.2 System Architecture Overview
The Shutter Island System is structured around three architectural patterns: Client–Server
Architecture, Layered Architecture, and Model–View–Controller (MVC). Together,
these patterns separate user interface concerns from business logic and data storage, en-

force secure role-based access control, and allow the system to serve multiple client types
over a single centralized backend. The modular decomposition of the backend into subsys-
tems (authentication, session management, betting, and reporting) further reflects service-
oriented design principles, ensuring that each subsystem has a clearly defined responsibility
and communicates with others through defined interfaces.


Architecture Visualizations

The following diagrams illustrate how the system’s client interfaces, backend subsystems,
and database are organized and how they relate to one another.

     Client Layer                     Backend Application Server

    Admin Dashboard                           Auth & RBAC


                                              Session Mgmt                              Data Layer
      Staff Console

                                                                                          MySQL
                                               Game Engine
     Intake Terminal                                                                      Database

                                                  Streaming
      Viewer Portal

                                                   Betting


                                                  Reporting


**Diagram:** Three-Tier System Architecture Overview.

Presentation Layer
                         Role-based dashboards, forms, monitoring UI


                           Authentication & Authorization Layer
                              RBAC, tokens, access-key validation


                                     Business Logic Layer
                   Session rules, progression, eliminations, betting, reporting


                                          Data Layer
                      MySQL schema, constraints, transactions, backups

**Diagram:** Layered Architecture View (four-tier separation of concerns).


      View              User Input           Controller       Commands / Queries       Model
  Role-based UI          Response         Request Handling                         Domain Entities


                                         MySQL Database

**Diagram:** Model–View–Controller (MVC) Interaction.


## V.3 Client–Server Architecture
The system operates using a centralized backend server that manages all business logic,
session state, and database transactions. Multiple client types connect securely over HTTPS,
ensuring encrypted communication across all interfaces.


### V.3.1 Client Layer

The Client layer comprises four distinct interfaces, each scoped to a specific user type and
set of permitted operations:

    • Administrator / Manager Dashboard: A web-based interface providing full system
      control, including session creation and scheduling, participant intake and verification,

real-time session monitoring, room progression control, session pause and termina-
      tion, report generation, and betting and audit review.

    • Staff Console: A web or tablet-based interface providing operational controls limited
      to participant check-in, session activation assistance, controlled room progression
      actions, and safety monitoring.

    • Participant Intake Interface: An on-site terminal responsible for capturing par-
      ticipant information, assigning unique tracking identifiers, and verifying participant
      status before session activation.

    • Viewer Portal: A web-based interface through which authorized viewers complete
      secure authentication, pay for access through the paywall mechanism, receive a unique
      access key, view the live stream, place bets, and review their bet history.

All client interfaces adhere to the following requirements:

    • Responsive design: All interfaces are accessible across desktop, tablet, and mobile
      devices without loss of functionality.

    • Browser compatibility: All interfaces are compatible with modern browsers, includ-
      ing the latest stable versions of Google Chrome, Mozilla Firefox, Microsoft Edge,
      and Apple Safari.

    • Role-based visibility: Interface elements are rendered strictly according to the au-
      thenticated user’s assigned role, preventing unauthorized actions or data exposure.

    • Encrypted communication: All client–server communication is transmitted over
      HTTPS, ensuring data protection in transit.


### V.3.2 Server Layer

The Server layer hosts all backend processing, including authentication, session orchestra-
tion, real-time synchronization, game engine execution, payment validation, betting logic,
reporting, and database transactions. The backend is logically divided into the following
subsystems:

    • Administration and Session Management Module: Responsible for creating and
      managing sessions, validating date, time, and capacity constraints, generating unique
      booking identifiers, managing participant records, enforcing cancellation and reschedul-
      ing policies, logging administrative actions, and executing emergency overrides.

• Game Engine and Progression Module: The core execution engine of the system.
      Responsible for session timer initiation, room sequencing logic, challenge progression
      control, event triggering, elimination validation, unlock rule enforcement, participant
      action recording, and synchronized session state maintenance.

    • Live Streaming Module: Responsible for stream lifecycle management, secure
      viewer authentication, encrypted stream delivery, stream-to-session binding, and ob-
      server access logging. Each session may have only one active stream at a time.

    • Betting Management Module: Strictly separated from gameplay logic. Responsible
      for bet validation, payment confirmation integration, bet record storage, outcome
      settlement logic, viewer account updates, audit logging, and report generation. The
      betting subsystem does not have write access to game engine state.

    • Reporting and Analytics Module: Responsible for generating session outcome
      reports, group performance metrics, individual performance records, elimination
      statistics, bet outcome reports, and audit summaries. All metrics are derived from
      stored logs to prevent redundant data storage.


## V.4 Layered Architecture
The system follows a four-tier layered structure that enforces strict separation of concerns,
ensuring that each layer has a clearly defined responsibility and communicates only with
adjacent layers.


### V.4.1 Presentation Layer

The Presentation layer is responsible for all user-facing interface elements and real-time
display updates. It renders role-based dashboards, forms, and monitoring views based on
the authenticated user’s role. The following are handled at this layer:

    • Role-based dashboards: Each user type (Administrator, Staff, and Viewer) is pre-
      sented with an interface scoped strictly to their permitted actions and visible data.

    • Forms and UI interactions: All user input, including session creation forms, par-
      ticipant registration, and bet placement interfaces, is captured and submitted through
      this layer.

• Real-time monitoring display: Active session status, participant elimination states,
      and room progression are rendered using WebSocket-based updates, refreshing at
      intervals not exceeding five seconds.

    • Stream viewing interface: Authorized viewers access the live stream through a
      dedicated interface rendered at this layer following successful access key validation.

    • Bet placement interface: Viewers may place bets on predefined session outcomes
      through a controlled interface that enforces paywall authorization before submission.


### V.4.2 Authentication and Authorization Layer

The Authentication and Authorization layer intercepts all requests before they reach business
logic, enforcing identity verification and access control across all user types. The following
responsibilities are handled at this layer:

    • Secure credential validation: All login attempts are verified against stored creden-
      tials before any system access is granted.

    • Role-Based Access Control (RBAC): Access rights are determined by the authen-
      ticated user’s assigned role (Administrator, Staff, or Viewer) and enforced on every
      request to prevent unauthorized actions.

    • Session token validation: Authenticated sessions are maintained through tokens that
      are validated on each request to ensure continued authorization.

    • Access key verification: Viewer access keys issued after paywall authorization are
      validated before entry to the live-streaming interface is permitted.

    • Paywall validation: Payment confirmation is verified before access keys are issued,
      ensuring that streaming access is granted only to paying viewers.


### V.4.3 Business Logic Layer

The Business Logic layer implements all system rules and enforces them before any database
commit is executed, ensuring that invalid operations are rejected at the application level.
The following are implemented at this layer:

    • Session management rules: Session creation, modification, scheduling, and termi-
      nation logic is enforced, including capacity validation and cancellation policies.

• Room unlocking logic: A room may only transition to unlocked status once the
      minimum required number of eliminations for that room has been recorded.

    • Elimination validation: A participant may only be eliminated once per session, and
      only participants with an active survival status may progress to subsequent rooms.

    • Performance metric computation: Session outcome metrics, individual participant
      statistics, and group performance summaries are computed from stored decision logs
      and elimination records.

    • Bet validation rules: Bets are validated against configured rules including bet type,
      session status, and participant eligibility before being accepted.

    • Payment confirmation checks: Both session booking payments and bet placement
      payments are verified through the integrated payment gateway before the correspond-
      ing operation is finalized.

    • Audit logging: All administrative actions, session control events, and betting activity
      are logged with timestamps and actor identifiers at this layer before being persisted.

    • Concurrency control: Row-level locking and atomic transaction management are
      coordinated at this layer to prevent data conflicts under concurrent session load.


### V.4.4 Data Layer

The Data layer is responsible for all persistent storage, retrieval, and integrity enforcement.
It serves as the single source of truth for all system state and guarantees data integrity and
referential consistency through the following:

    • MySQL relational database: The primary database management system, selected
      for its strong transactional support, referential integrity enforcement, and compatibil-
      ity with the system’s structured relational schema.

    • Structured relational schema: Tables are organized by functional subsystem and
      fully normalized to eliminate redundant data storage.

    • Foreign key constraints: All inter-table relationships are enforced at the database
      level, preventing orphaned or inconsistent records.

    • Indexed queries: Frequently accessed columns, including session identifiers and
      participant status fields, are indexed to maintain query performance under concurrent
      load.

• Transaction management: All multi-step write operations are executed within trans-
      actions, ensuring that partial failures result in complete rollbacks with no inconsistent
      state persisted.

    • Controlled schema versioning: Database schema changes are managed through
      versioned migration scripts to preserve data integrity during system updates and
      future expansions.


## V.5 Model–View–Controller (MVC)
The MVC pattern structures the web application implementation, separating domain logic,
user interface rendering, and request handling into three distinct layers.


### V.5.1 Model

The Model layer represents the core domain entities of the system and enforces data integrity
rules at the application level. The following entities are defined:

    • Core entities: Manager, Player, GameSession, SessionPlayer, Room, Challenge,
      RoomChallenge, SessionRoom, SessionRoomPlayer, Elimination, EnvironmentEvent,
      LiveStream, ViewerAccessKey, Bet, and AuditLog.

Each model enforces the following constraints:

    • Primary key constraints: Every entity is uniquely identifiable through a system-
      assigned primary key.

    • Foreign key relationships: Associations between entities, such as a Bet referencing
      a GameSession and LiveStream, are enforced to maintain referential integrity.

    • Check constraints: Field-level rules, such as slot number ranges and status enumer-
      ations, are validated before any record is persisted.

    • Status validation rules: Entities with lifecycle states, such as GameSession and Bet,
      enforce valid status transitions to prevent inconsistent state changes.


### V.5.2 View

The View layer is dynamically rendered based on the authenticated user’s assigned role,
ensuring that each user type sees only the interface elements relevant to their permissions:

• Administrator View: Provides full system control, including session management,
      participant oversight, real-time monitoring, emergency override execution, and report
      generation.

    • Staff View: Provides operational controls limited to participant check-in, session
      activation assistance, and safety monitoring.

    • Viewer View: Restricted to live stream access, bet placement, and personal bet
      history viewing.


### V.5.3 Controller

The Controller layer coordinates the flow between the View and Model layers, handling
authentication checks, business logic execution, database transactions, and response gener-
ation. The following controllers are defined:

    • AuthenticationController: Manages credential validation, token issuance, and role-
      based access enforcement for all user types.

    • SessionController: Handles session creation, modification, scheduling, and lifecycle
      management.

    • ParticipantController: Manages participant registration, check-in verification, and
      status updates.

    • GameEngineController: Coordinates session timer initiation, room progression,
      challenge sequencing, and elimination processing.

    • StreamingController: Manages stream lifecycle, viewer access key validation, and
      encrypted stream delivery.

    • BettingController: Handles bet placement, payment confirmation integration, out-
      come settlement, and refund processing.

    • ReportingController: Generates session outcome reports, performance metrics, bet
      summaries, and audit logs.

## V.6 Deployment Architecture
The deployment architecture illustrates how the system components are distributed across
physical infrastructure.


**Diagram:** Deployment Architecture


Client devices such as web browsers connect to the application server using HTTPS. The
application server hosts the backend logic including authentication services, session man-
agement, betting logic, and streaming coordination. The application server communicates
with the MySQL database server using SQL queries to store and retrieve persistent data.

## V.7 Database Integration
The system integrates directly with a MySQL relational database that serves as the single
source of truth for all session state, participant records, gameplay progression, streaming
access, betting activity, and administrative audit data.


### V.7.1 Design Principles

The schema adheres to the following design principles:

    • Fully normalized schema: Player, session, and room data are defined once and
      referenced consistently across all subsystems, eliminating redundant storage.

    • Foreign key enforcement: Referential integrity is enforced at the database level,
      preventing orphaned records: for example, a bet cannot reference a session or stream
      that does not exist.

    • Transaction-safe operations: All multi-step operations are wrapped in transactions,
      ensuring that if any step fails, the entire operation rolls back and no partial state is
      committed.

    • Indexed query optimization: Frequently queried columns, such as session identifiers
      and player status fields, are indexed to ensure fast retrieval under concurrent load.

    • Strict constraint validation: Rules such as slot number ranges and status enu-
      merations are enforced at the schema level, providing a second layer of validation
      independent of application logic.

    • Logical subsystem grouping: Tables are organized by functional subsystem to
      maintain separation of concerns and simplify maintenance.


### V.7.2 Concurrency Control

The following mechanisms are employed to prevent data conflicts under concurrent load:

    • Row-level locking: Applied during room progression updates, ensuring that two
      administrators cannot modify the same session room simultaneously.

    • Atomic elimination writes: When a player is eliminated, their survival flag and
      elimination timestamp are committed together, so the database is never left in a
      partially updated state.

• Idempotent bet settlement: Settlement logic is designed so that processing the same
     operation twice produces the same result, preventing duplicate payouts or records.

   • Unique transaction identifiers: Payment gateway callbacks are assigned unique
     identifiers, preventing duplicate charges if the same confirmation is received more
     than once.

   • Validated state transitions: Session state changes, such as Active to Finished, are
     validated against the current database state before being committed, ensuring invalid
     transitions are rejected at the data layer.


### V.7.3 Critical Business Rules

The database enforces the following business rules to maintain gameplay integrity:

   • Single elimination per session: A participant may be eliminated only once per
     session, enforced through a unique constraint on the Elimination table.

   • Active participant progression: Only participants whose survival status is active
     may progress to subsequent rooms, preventing eliminated players from re-entering
     gameplay.

   • Room unlock threshold: A room may only unlock the next room once the required
     minimum number of eliminations has been recorded.

   • Single live stream per session: Each game session may have at most one active live
     stream at any time.

   • Unique access keys: Viewer access keys are unique and traceable to a specific stream
     and viewer identity, preventing reuse or sharing.

   • Payment-validated bets: Bets are only accepted after payment confirmation has
     been received and validated through the integrated payment gateway.

   • Administrative audit logging: All administrative actions, including session control,
     participant management, and emergency overrides, are recorded in the audit log with
     timestamps and actor identifiers.

## V.8 Function Distribution Across Modules

**Table:** Function Distribution Across System Modules

  Function                        Module                    Description
  Session creation and schedul-   Administration and Ses-   Creates, validates, and
  ing                             sion Management           stores session configu-
                                                            rations
  Participant registration        Administration and Ses-   Captures and stores par-
                                  sion Management           ticipant records with
                                                            unique identifiers
  Session lifecycle control       Administration and Ses-   Handles pause, resume,
                                  sion Management           and termination of ac-
                                                            tive sessions
  Emergency override execu-       Administration and Ses-   Allows administrators
  tion                            sion Management           to immediately inter-
                                                            vene in active sessions
  Session timer initiation        Game Engine and Pro-      Starts the session count-
                                  gression                  down upon administra-
                                                            tor approval
  Room sequencing and unlock-     Game Engine and Pro-      Controls progression
  ing                             gression                  between rooms based
                                                            on elimination thresh-
                                                            olds
  Challenge execution             Game Engine and Pro-      Triggers and manages
                                  gression                  predefined challenge se-
                                                            quences within rooms
  Elimination processing          Game Engine and Pro-      Validates and records
                                  gression                  participant eliminations
  Session state synchronization   Game Engine and Pro-      Maintains consistent
                                  gression                  session state across all
                                                            active interfaces
  Stream lifecycle management     Live Streaming            Controls stream start,
                                                            pause, and termination
                                                            tied to session state
  Encrypted stream delivery       Live Streaming            Transmits live audiovi-
                                                            sual data securely to au-
                                                            thorized viewers
  Observer access logging         Live Streaming            Records viewer access
                                                            activity for monitoring
                                                            and auditing

Function Distribution Across System Modules (continued)

Function                       Module                  Description
Bet placement and validation   Betting Management      Accepts and validates
                                                       bets against configured
                                                       rules
Payment confirmation           Betting Management      Verifies        payment
                                                       through the integrated
                                                       payment gateway
Bet outcome settlement         Betting Management      Evaluates and settles
                                                       bets upon session com-
                                                       pletion
Refund processing              Betting Management      Cancels and refunds
                                                       pending bets on session
                                                       termination
Session outcome reporting      Reporting and Analyt-   Generates post-session
                               ics                     performance and out-
                                                       come summaries
Performance metric computa-    Reporting and Analyt-   Derives participant and
tion                           ics                     group statistics from
                                                       stored logs
Audit log generation           Reporting and Analyt-   Compiles administra-
                               ics                     tive action records for
                                                       traceability
Credential validation          Auth and RBAC           Verifies user identity
                                                       before granting system
                                                       access
Role enforcement               Auth and RBAC           Restricts interface and
                                                       data access based on as-
                                                       signed user role
Access key verification        Auth and RBAC           Validates viewer access
                                                       keys before permitting
                                                       stream entry
Paywall authorization          Auth and RBAC           Confirms payment be-
                                                       fore issuing viewer ac-
                                                       cess keys

## V.9 Reused Components Across Modules
Several architectural components are reused across multiple modules within the system to
improve consistency, reduce duplication, and simplify maintenance. The Authentication and
Authorization component is shared by the Administration & Session Management Module,
the Live Streaming Module, and the Betting Management Module to enforce secure login,
role-based access control, and viewer access validation. In addition, the Payment Gateway
component is reused by both the Administration & Session Management Module and the
Betting Management Module to process financial transactions related to session booking
and betting activities. The system also relies on a centralized Data Layer (MySQL database)
that is utilized by all core modules, including the Game Engine & Progression Module and
the Reporting & Analytics Module, to store session data, participant information, betting
records, and system logs. By sharing these components among modules, the architecture
promotes modularity, maintainability, and consistent system behavior.


**Diagram:** UML Component Diagram Showing Reused Architectural Components Across
System Modules

# VI. System Requirements Specification


## VI.1 Functional Requirements

### VI.1.1 Session Administration

SR-SES-1 The system shall validate session availability by checking date, time, and max-
    imum capacity before confirming a booking.

SR-SES-2 The system shall generate a unique booking identifier for each session.

SR-SES-3 The system shall enforce configurable cancellation and rescheduling policies,
    automatically updating session availability upon modification.

SR-SES-4 The system shall process payment confirmation through an integrated payment
    gateway before finalizing booking status.

SR-SES-5 The system shall maintain transaction logs for all booking-related financial
    operations.


### VI.1.2 Participant Management

SR-PAR-1 The system shall store participant personal information securely in the database
    with unique participant identifiers.

SR-PAR-2 The system shall validate that the number of checked-in participants meets the
    session’s configured minimum before allowing activation.

SR-PAR-3 The system shall update and reflect each participant’s status in real time across
    all active interfaces, transitioning between Active, Eliminated, and Finished states as
    session events occur.

### VI.1.3 Game Management

SR-GAME-1 The system shall initiate a session timer and activate predefined challenge
    sequences upon administrator approval.

SR-GAME-2 The system shall execute level progression logic based on predefined rules
    stored in the game engine configuration.

SR-GAME-3 The system shall record participant actions and triggered events within each
    level.

SR-GAME-4 The system shall calculate performance metrics using stored decision logs,
    time tracking, and level completion data and shall expose these metrics through the
    administrative dashboard and reporting module.

SR-GAME-5 The system shall automatically set GameSession.Status to Finished
    when exactly one SessionPlayer record remains with IsAlive = TRUE, and shall
    assign that player FinalRank = 1.


### VI.1.4 Monitoring

SR-MON-1 The system shall provide a real-time dashboard displaying active sessions,
    participant statuses, and level progression updated at intervals not exceeding five
    seconds.

SR-MON-2 The system shall log all administrative actions, including session control, par-
    ticipant management, and override executions, with timestamps and actor identifiers.


### VI.1.5 Data Management and Reporting

SR-DAT-1 The system shall store session history, participant activity logs, and elimination
    data in a structured relational database.

SR-DAT-2 The system shall provide analytical reports summarizing session outcomes,
    group performance metrics, and participant progression statistics.

SR-DAT-3 The system shall derive performance metrics from stored decision logs, time
    tracking data, and elimination records to ensure consistent analytical computation
    without requiring redundant data storage.

### VI.1.6 Authentication and Access Control

SR-SEC-1 The system shall authenticate staff users using secure credential validation
    before granting system access.

SR-SEC-2 The system shall enforce role-based access restrictions for all system users
    (Administrator, Staff, Viewer).

SR-SEC-3 The system shall authenticate viewer accounts before granting access to stream-
    ing and betting management module.

SR-SEC-4 The system shall enforce paywall authorization before issuing unique access
    keys, and shall validate those keys before permitting entry to the live-streaming
    interface.

SR-SEC-5 The system shall support a viewer role with restricted permissions limited to
    viewing and betting features.


### VI.1.7 Live Streaming

SR-STR-1 The system shall provide authorized viewers with access to a live-streaming
    interface for active sessions.

SR-STR-2 The system shall ensure viewers cannot send inputs or actions that affect game-
    play or participant states.

SR-STR-3 The system shall encrypt live-streaming data to prevent unauthorized access.

SR-STR-4 The system shall log observer access activity for monitoring and auditing pur-
    poses.


### VI.1.8 Payment and Betting

SR-BET-1 The system shall allow authorized viewers to place bets on predefined session
    outcomes.

SR-BET-2 The system shall validate each bet based on configured rules and payment
    confirmation before accepting it.

SR-BET-3 The system shall store bet details including observer identity, selected outcome,
    timestamp, and bet amount.

SR-BET-4 The system shall automatically evaluate session outcomes against each placed
    bet upon GameSession.Status transitioning to Finished, and shall update each
    bet’s status to Won or Lost accordingly.

SR-BET-5 The system shall generate bet outcome reports for administrative review.

SR-BET-6 The system shall log observer access and bet activity for auditing purposes.

SR-BET-7 The system shall process betting payment confirmation through an integrated
    payment gateway.

SR-BET-8 The system shall automatically cancel and refund all Pending bets associated
    with a GameSession if that session is terminated, cancelled, or expires without
    reaching a settleable outcome.


## VI.2 Non-Functional Requirements

### VI.2.1 Performance

NFR-PER-1 The system shall respond to user interactions within 3 seconds under normal
    operating conditions.

NFR-PER-2 The system shall support a minimum of 500 concurrent users, including
    administrators, staff, participants, and viewers, without performance degradation.

NFR-PER-3 The system shall maintain stable live-stream delivery to authorized viewers
    under expected concurrent load.


### VI.2.2 Security

NFR-SEC-1 The system shall implement Role-Based Access Control (RBAC) to restrict
    access according to user roles (Administrator, Staff, Viewer).

NFR-SEC-2 All data transmissions shall be encrypted using the HTTPS protocol.

NFR-SEC-3 Sensitive participant data shall be stored using secure database practices,
    including encryption where applicable.

NFR-SEC-4 The system shall enforce strict separation between the gameplay subsystem
    and the betting subsystem to prevent interference with session execution.

NFR-SEC-5 The system shall record and retain security logs for observer access and bet
    activity.


### VI.2.3 Reliability

NFR-REL-1 The system shall maintain operational availability during scheduled business
    hours.

NFR-REL-2 The system shall automatically perform daily database backups.

NFR-REL-3 The system shall support full system recovery within 4 hours in the event of
    system failure.

NFR-REL-4 The system shall maintain data integrity through transaction management
    and error-handling mechanisms.


### VI.2.4 Scalability

NFR-SCA-1 The system shall support horizontal and vertical scaling to accommodate
    increased participant volume and session demand.

NFR-SCA-2 The database architecture shall allow expansion without structural redesign.


### VI.2.5 Usability

NFR-USA-1 The system shall provide an intuitive graphical user interface for administra-
    tors and staff.

NFR-USA-2 The dashboard shall display session and participant status using clear visual
    indicators.

NFR-USA-3 The system shall minimize required user actions to perform critical adminis-
    trative tasks.


### VI.2.6 Compatibility

NFR-COM-1 The system shall be accessible via modern web browsers on desktop, tablet,
    and mobile devices.

NFR-COM-2 The system shall support the latest stable versions of Google Chrome,
    Mozilla Firefox, Microsoft Edge, and Apple Safari.

### VI.2.7 Framework and Database

NFR-FRW-1 MySQL shall be used as the primary database management system.

NFR-FRW-2 The system shall implement structured relational schemas to ensure data
    consistency and integrity.

NFR-FRW-3 The system shall support concurrent session management without data con-
    flict through row-level locking and atomic transaction control mechanisms.

# VII. System Models


## VII.1 Use-Cases

### VII.1.1 Administrator Use-Cases

The Administrator is a privileged system operator responsible for supervising and man-
aging operational aspects of the Shutter Island System. Administrators have full control
over session management and system monitoring. Their responsibilities include creating
and modifying game sessions, overseeing ongoing gameplay, tracking participant status,
reviewing betting activity, and observing room progression throughout a session. Ad-
ministrators also maintain system integrity by responding to abnormal situations through
emergency override actions when necessary. At the end of a session, the administrator can
terminate the session to finalize the results and trigger system notifications to participants
and viewers. Access to administrative functions is protected through secure authentication
and role-based access control mechanisms to ensure that only authorized personnel can
perform these operations.


Manage Sessions

This use case allows the Administrator to create, modify, and supervise scheduled game
sessions within the system. Through the administrative interface, the administrator can
define session parameters such as date, time, and participant capacity. The system validates
the entered details before confirming the session. This ensures that session scheduling is
controlled and consistent with operational rules.


### VII.1.2 Manage Participants

This use case enables the Administrator to register and organize participant information
before a session begins. During this process, the system assigns a unique tracking identifier
to each participant to support accurate identification and monitoring. The administrator

can also verify participant presence and prepare them for session activation. This use case
ensures that all participants are properly recorded before gameplay starts.


Control Active Session

This use case allows the Administrator to manage the operational flow of an ongoing game
session. Once a session is active, the administrator can start, pause, resume, or terminate it
depending on gameplay conditions. These controls are important for maintaining order and
handling unexpected interruptions. The system records these control actions to preserve
session integrity and traceability.


Monitor Gameplay

This use case allows the Administrator to observe the real-time status of players and session
progression. Through the monitoring interface, the administrator can track participant
states, elimination events, and room progression. This visibility helps detect irregular events
and maintain fair session supervision. Continuous monitoring also supports administrative
decision-making during gameplay.


Generate Reports

This use case enables the Administrator to review session outcomes and performance
statistics after gameplay has ended. The system compiles stored session data, participant
records, and progression logs into analytical summaries. These reports support operational
evaluation and future planning. The generated output may also assist in auditing and
administrative review.

**Diagram:** Use Case Diagram showing the Administrator’s session management work-
flow, including session creation, participant preparation, and session control operations.

**Diagram:** Use Case Diagram showing the Administrator’s monitoring workflow, in-
cluding gameplay observation, participant status tracking, and session supervision.


### VII.1.3 Viewer Use-Cases

The Viewer represents an external user role that interacts with the Shutter Island System
primarily for observation and betting purposes. Viewers access the system through a
restricted interface that allows them to observe live sessions without influencing gameplay
or participant states. To enter the live-streaming environment, viewers must first obtain
authorized access through a paywall mechanism integrated with a payment gateway. After
successful payment, the system generates an access key that allows the viewer to authenticate
and access the live-stream interface. Once connected, viewers can observe active sessions
in real time and place bets on predefined outcomes.

Access Live Stream

This use case allows the Viewer to observe an active game session through the live-streaming
interface. Before access is granted, the viewer must complete authentication and provide
valid access keys generated through the paywall process. The system verifies authorization
and then establishes a secure streaming session. Once connected, the viewer can watch
gameplay in real time without affecting participant activity.


Place Bet

This use case allows the Viewer to place a bet on a predefined session outcome. The viewer
selects an available outcome and submits the corresponding wager through the betting
interface. The system validates the bet according to defined rules and confirms the payment
through the integrated payment gateway. After successful confirmation, the bet is stored for
later evaluation when the session ends.


View Bet History

This use case enables the Viewer to access a record of previously placed bets. The system
retrieves stored betting information, including outcomes, timestamps, and result status.
This provides transparency regarding viewer activity and previous wagers. The feature also
allows viewers to review the results of completed bets.

**Diagram:** Use-case diagram illustrating the Viewer workflow, including authentication,
paywall access, entry to the live stream, and betting interaction.


## VII.2 Activity Diagrams
The following diagrams provide a high-level overview of the workflows associated with the
two primary system roles. The Administrator diagram outlines the key operations available
to privileged system operators, including session management, participant control, and
monitoring. The Viewer diagram illustrates the steps a viewer follows to gain access to the

system, navigate the paywall, and interact with the live-streaming and betting interfaces.


**Diagram:** illustrating the Viewer authentication process, paywall access, access
key generation, and entry into the live-streaming interface.

**Diagram:** showing the Administrator’s ability to monitor active sessions, track
participant status, control gameplay flow, and execute emergency overrides.

## VII.3 Game Session Workflow
Activity diagrams represent the workflow of system processes and the sequence of operations
performed to complete a task. The following diagram illustrates the lifecycle of a game
session within the system.
The process begins when a session is created by the administrator. Players join the session
and participate in challenges while the system tracks eliminations and updates player status.
The session continues until a winner is determined, after which the session is closed and
results are stored in the database.

**Diagram:** Activity Diagram for Game Session Workflow

## VII.4 State Machine

### VII.4.1 Game Session Lifecycle

State machine diagrams describe how a system object changes its state in response to
events. In the Shutter Island system, game sessions progress through several states during
their lifecycle.
Initially, a session is scheduled by an administrator. Once the session begins, it transitions to
the active state where players participate in challenges. The session may temporarily enter
a paused state if required. When all challenges are completed or a winner is determined,
the session moves to the finished state. Finally, the session is archived for record keeping
and reporting purposes.


**Diagram:** State Machine Diagram for Game Session Lifecycle

## VII.5 System Interaction Model

### VII.5.1 Sequence Diagram: Bet Placement

The sequence diagram illustrates the interaction between system components during the
process of placing a bet.


**Diagram:** Sequence Diagram for Bet Placement


When a viewer places a bet, the request is sent to the backend application which forwards
the request to the betting service. The betting service verifies the user and communicates
with the payment gateway to confirm the transaction, validating the viewer’s access key
and eligibility. Once the payment is approved, the bet is recorded in the database and a
confirmation is returned to the viewer portal.


## VII.6 Data Flow Models
To complement the system context diagram, the Data Flow Model (DFD) illustrates how
information moves between external entities, internal processes, and core data stores in
the Shutter Island system. While the context diagram defines the system boundary and
its external interactions, the DFD provides a more detailed functional view of how ses-
sion management, gameplay progression, live-stream access, and betting operations are
processed within the system.
The DFD is presented at two abstraction levels. The Level 0 DFD provides a high-level
representation of the overall system as a single process interacting with external actors
and external services. The Level 1 DFD decomposes the system into its principal internal

processes and shows the major data stores involved in core operations. These diagrams are
consistent with the system architecture, the functional requirements, and the database design
described in Appendix X.2 of this document, particularly the use of persistent entities such
as Manager, Player, GameSession, SessionRoom, ViewerAccessKey, and Bet.


### VII.6.1 Level 0 DFD

The diagram presents the Level 0 Data Flow Diagram of the Shutter Island system. At
this level, the entire software platform is modeled as a single process that interacts with
the primary external entities: the Administrator, the Viewer, and the external Payment
Gateway. The Administrator provides login credentials, session configuration data, con-
trol commands, and report requests, while receiving authentication results, session status
information, and generated reports. The Viewer submits login credentials, stream access
requests, bet requests, and payment details, and receives stream access, live-stream in-
teraction results, bet confirmations, and bet outcomes. The Payment Gateway exchanges
payment requests and confirmations with the system to authorize viewer access and betting
operations.


**Diagram:** Level 0 Data Flow Diagram for the Shutter Island System


The Level 0 DFD is intentionally abstract. Its purpose is to show the system boundary and
the major information exchanges with actors outside the software system, without exposing
internal processing details. This makes it a natural refinement of the system context diagram
presented in the diagram.

### VII.6.2 Level 1 DFD

The diagram presents the Level 1 Data Flow Diagram, which decomposes the Shutter Island
system into its principal internal processes. These include session creation and control,
administrator access management, participant management, game progression, live-stream
access management, bet placement and validation, and outcome and payout tracking. The
diagram also includes the major persistent data stores required at this level of abstraction:
Manager, Player, GameSession, SessionRoom / Room, ViewerAccessKey, and Bet.


**Diagram:** Level 1 Data Flow Diagram for the Shutter Island System


The Level 1 DFD shows how administrative actions flow through authentication and session-
control processes, how participant information is recorded and used during gameplay pro-
gression, how room progression interacts with session data, and how viewer access and
betting operations are isolated into dedicated processes. This decomposition is consistent
with the modular architecture already described in the report, including the Administration
and Session Management Module, the Game Engine and Progression Module, the Live
Streaming Module, and the Betting Management Module.

# VIII. System Evolution


The “Shutter Island” system has been designed using a modular client–server architecture
to ensure scalability, maintainability, and controlled extensibility. Core subsystems, includ-
ing session management, real-time game engine processing, authentication, and betting
management, are logically separated to support incremental enhancement without major
structural redesign. These subsystems are implemented as independent functional mod-
ules, each responsible for a specific aspect of the system such as authentication, session
management, betting, and reporting. The system also integrates external services such as
a payment gateway to support secure transaction processing within the betting subsystem.
This modular structure enables future expansion while preserving backward compatibility
and operational stability.
To ensure controlled complexity and reliable performance, the system is initially designed
to operate within a constrained environment, focusing on a single room and a specific theme.
This approach allows core mechanics, session tracking, betting, and system interactions to
be validated in a controlled setting. As additional rooms and dynamic gameplay features
are introduced, the system is expected to maintain real-time synchronization, fairness,
participant safety, and observer consistency in alignment with the overall design objectives.
The architecture is designed to support future scalability through the extension of existing
modules and the introduction of new system capabilities. Enhancements may include ad-
vanced analytics, improved monitoring mechanisms, and more sophisticated game features.
The modular structure ensures that such extensions can be integrated without disrupting
existing system functionality.
The relational database schema, implemented using MySQL, supports structured extensi-
bility and controlled growth. Future improvements may focus on performance optimization
and efficient handling of increasing data volumes while maintaining data integrity and
consistency.
Security mechanisms may evolve to incorporate stronger authentication methods, enhanced
access control, and improved monitoring to ensure the protection of user data, system
operations, and financial transactions.

All future enhancements will follow structured development practices, including version
control, regression testing, and controlled deployment, ensuring that system evolution does
not compromise functional correctness, performance, security, or data consistency.

# IX. User Test-Cases


## IX.1 Administration & Participant Management

### IX.1.1 Functional Requirements

### SR-SES-1: Session Availability Validation


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-1 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-1 Negative Test Case

### SR-SES-2: Unique Booking Identifier Generation


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-2 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-2 Negative Test Case

### SR-SES-3: Cancellation / Rescheduling Policies


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-3 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-3 Negative Test Case

### SR-SES-4: Payment Confirmation Before Finalizing Booking


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-4 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-4 Negative Test Case

### SR-SES-5: Transaction Logs


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-5 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-SES-5 Negative Test Case

### SR-PAR-1: Secure Storage of Participant Information


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-PAR-1 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-PAR-1 Negative Test Case

### SR-PAR-2: Minimum Checked-In Participant Validation


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-PAR-2 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-PAR-2 Negative Test Case

### SR-PAR-3: Real-Time Participant Status Updates


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-PAR-3 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** SR-PAR-3 Negative Test Case

### IX.1.2 Non-Functional Requirements

### NFR-USA-1: Intuitive GUI


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** NFR-USA-1 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** NFR-USA-1 Negative Test Case

### NFR-USA-2: Visual Indicators


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** NFR-USA-2 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** NFR-USA-2 Negative Test Case

### NFR-USA-3: Minimal User Actions


Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** NFR-USA-3 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSES1-001                                            Test Designed by: Shahd Qaddoura
Test Priority (Low/Medium/High): High                                  Test Designed date: April 1, 2026
Module Name: Session Administration                                    Test Executed by: Shahd Qaddoura
Test Title: Verify booking is accepted when session date, time,        Test Execution date: April 1, 2026
and capacity are valid
Description: Test that the system validates session availability successfully and permits booking when the selected session has a valid
schedule and available capacity.

Pre-conditions:
    Administrator is logged into the system
    A session exists with a valid date and time
    The selected session still has available slots
    A participant record exists in the system
Dependencies:
    Session configuration functionality must be operational
    Booking validation service must be implemented
    Capacity tracking must reflect real-time availability

                                                                Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                 (Pass/Fail)
                                     Valid administrator        Administrator is              Administrator logged in          Pass
1      Log in as administrator       credentials                authenticated successfully    successfully
       Navigate to the booking                                  Booking interface is          Booking interface displayed      Pass
2      interface                     N/A                        displayed
                                     Session ID: SES-101,       System displays session       Session details displayed        Pass
3      Select an available session   Capacity: 20, Booked: 18   details correctly             correctly
       Enter participant booking                                System accepts the booking    Booking request accepted         Pass
4      request                       Participant ID: PAR-001    request for validation
                                                                System verifies date, time,   Booking validated successfully   Pass
5      Confirm booking               1 booking request          and capacity successfully
                                                                System creates the booking    Booking completed and            Pass          Remaining
                                                                and updates remaining         capacity updated                               slots reduced
6      Finalize booking              Booking for PAR-001        capacity                                                                     to 1

Post-conditions:
     Booking is stored successfully in the database
     Session capacity is updated accordingly
     Booking transaction is recorded for auditing purposes


**Test Case:** NFR-USA-3 Negative Test Case

## IX.2 Game Management

### IX.2.1 Functional Requirements

### SR-GAME-1: Session Timer and Challenge Activation


Project Name: Shutter Island
Test Case ID: TC-SRGAME1-001                                           Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                  Test Designed date: March 29, 2026
Module Name: Game Session Management                                   Test Executed by: Reem Nemr
Test Title: Verify session timer initiation and challenge activation Test Execution date: April 1, 2026
upon admin approval
Description: Test that the system starts a session timer and activates predefined challenge sequences after administrator approval.

Pre-conditions:
 • Administrator is logged into the system
 • Game session is configured with predefined challenge sequences
 • User is ready to start session
Dependencies:
 • Admin approval functionality must be working
 • Challenge sequences must be preloaded in the system

                                                                                                                   Status
Step Test Steps                  Test Data               Expected Result                Actual Result              (Pass/Fail)    Notes
                                                                                        Admin logged in
1     Login as administrator     Admin credentials       Admin successfully logs in     successfully               Pass
      Navigate to session                                Session control panel is
2     control panel              N/A                     displayed                      Panel displayed            Pass

3      Approve session start     Session ID: S001        System accepts approval        Approval accepted          Pass
                                                         Session timer starts
                                                                                        Timer started              Pass
      System initiates session                           immediately after admin
4     timer                      N/A                     approval
      System activates                                   Challenges are activated and   Challenges activated
      predefined challenge                               visible to user                correctly                  Pass
5     sequences                  Predefined challenges

Post-conditions:
 • Session timer is running
 • Challenge sequences are active and accessible to users
 • System logs session start and admin approval in database


**Test Case:** SR-GAME-1 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRGAME1-002                                           Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                  Test Designed date: March 29, 2026
Module Name: Game Session Management                                   Test Executed by: Reem Nemr
Test Title: Verify session does NOT start without administrator        Test Execution date: April 1, 2026
approval
Description: Test that the system does not initiate a session timer or activate challenges if administrator approval is not granted.

Pre-conditions:
 • Administrator is NOT logged in or has not approved the session
 • Game session is configured with predefined challenge sequences
Dependencies:
•   Session control system must enforce admin approval validation

                                                                                                                     Status
Step Test Steps                  Test Data                 Expected Result               Actual Result               (Pass/Fail)       Notes
     Attempt to start session                              System should block session   System prevented session
1    without admin approval      Session ID: S001          start                         start                       Pass
       Check session timer
2                                N/A                       Timer should NOT start        Timer not started           Pass
      Check challenge                                      Challenges should NOT be
3     activation                 Predefined challenges     activated                     Challenges not activated    Pass
      System displays error or                             System displays error
      warning message            N/A                       message: admin approval       Error message displayed     Pass
4                                                          required

Post-conditions:
 • Session timer remains inactive
 • No challenges are activated
 • System logs failed attempt or unauthorized action


**Test Case:** SR-GAME-1 Negative Test Case

Project Name: Shutter Island
Test Case ID: TC-SRGAME1-003                                        Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): Medium                             Test Designed date: March 29, 2026
Module Name: Game Session Management                                Test Executed by: Reem Nemr
Test Title: Verify unauthorized user cannot initiate session timer  Test Execution date: April 1, 2026
or activate challenges
Description: Test that the system blocks a non-administrator from approving session start, and does not start the timer or activate
challenges.

Pre-conditions:
 • Session is created and configured with predefined challenge sequences
 • A non-administrator user is logged in
 • Session is in pending state
Dependencies:
 • Role-based access control must be active
 • Session approval must be restricted to administrators

                                                                                                                           Status
Step Test Steps                 Test Data                  Expected Result                  Actual Result                  (Pass/Fail)   Notes
      Log in as non-            Staff/Viewer credentials   User successfully logs in with   User logged in
1     administrator user                                   limited permissions                                             Pass
      Navigate to session                                  Session details may be visible   Session details
2     control area              Session ID: S001           based on role                    displayed/restricted           Pass
                                                                                            correctly
      Attempt to approve        Session ID: S001           System denies approval            Approval denied
3     session start                                        action                                                          Pass
                                                                                            Session timer is not started
      Verify session state      N/A                        Timer not started and            and challenges remain          Pass
4                                                          challenges not activated         inactive

Post-conditions:
 • Session remains unapproved
 • Session timer remains inactive
 • Challenge sequences remain inactive
 • Unauthorized approval attempt is logged


**Test Case:** SR-GAME-1 Unauthorized User Test Case

### SR-GAME-2: Level Progression Logic


Project Name: Shutter Island
Test Case ID: TC-SRGAME2-001                                         Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                Test Designed date: March 29, 2026
Module Name: Game Engine / Level Progression                         Test Executed by: Reem Nemr
Test Title: Verify level progression follows predefined game         Test Execution date: April 1, 2026
engine rules
Description: Test that the system progresses the session from one level to the next according to the predefined rules configured in the
game engine.

Pre-conditions:
 • Administrator is logged in and the session is active
 • Level progression rules are configured in the game engine
 • Current level completion conditions are satisfied
Dependencies:
 • Game engine configuration must be loaded correctly
 • Session and level data must be available

                                                                                                                   Status
Step Test Steps                  Test Data                    Expected Result               Actual Result          (Pass/Fail)    Notes

1      Login as administrator    Session ID: S002             Active session is displayed   Session displayed      Pass
       and open active session
      Complete the current       Level 1 completed,           System detects level
2     level according            required eliminations = 2,   completion                    Completion detected    Pass
      toconfigured rules         recorded eliminations = 2
      Trigger progression        Unlock rule: next level      System evaluates              Rules evaluated
3     check                      activates when               progression rules from        successfully           Pass
                                 eliminations >= 2            game engine configuration
                                                              System activates Level 2                             Pass
4     Verify next level          Next level: Level 2          after validating the unlock   Level 2 activated
      activation                                              rule

Post-conditions:
 • Current level is marked as completed and next level is activated according to predefined rules
 • Level progression event is recorded in the system log


**Test Case:** SR-GAME-2 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRGAME2-002                                           Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                  Test Designed date: March 29, 2026
Module Name: Game Engine / Level Progression                           Test Executed by: Reem Nemr
Test Title: Verify level does NOT progress when predefined rules Test Execution date: April 1, 2026
are not satisfied
Description: Test that the system prevents level progression if the required predefined conditions in the game engine configuration are
not met.

Pre-conditions:
 • Session is active
 • Level progression rules are configured in the game engine
 • Current level completion conditions are NOT satisfied
Dependencies:
 • Game engine configuration must be loaded correctly
 • Level validation logic must be functional

                                                                                                                      Status
Step Test Steps                  Test Data                  Expected Result                 Actual Result             (Pass/Fail)   Notes
      Open active session        Session ID: S002
1                                                           Active session is displayed     Session displayed         Pass

      Attempt to trigger level   Required eliminations =    System evaluates rules and
      progression without        2, recorded eliminations   detects unmet conditions        Conditions not met        Pass
      completing level           =1
2     requirements
      Verify level status        Current level: Level 1     System keeps Level 1 active     Level remains unchanged   Pass
3                                                           and does not activate Level 2
                                                            System displays message:                                  Pass
4     Verify system displays     N/A                        progression conditions not      Message displayed
      error message                                         met

Post-conditions:
 • Current level remains active
 • No progression to next level occurs
 • System logs failed progression attempt


**Test Case:** SR-GAME-2 Negative Test Case

### SR-GAME-3: Action and Event Recording


Project Name: Shutter Island
Test Case ID: TC-SRGAME3-001                                          Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                 Test Designed date: March 29, 2026
Module Name: Game Engine / Event Logging                              Test Executed by: Reem Nemr
Test Title: Verify participant actions and triggered events are       Test Execution date: April 1, 2026
recorded within a level
Description: Test that the system records participant actions and triggered events during an active level.

Pre-conditions:
 • Administrator is logged in
 • Session is active
 • A level is currently active
 • At least one participant is present in the level
Dependencies:
 • Action and event logging mechanisms must be enabled
 • Session and participant data must be available

                                                                                                                        Status
Step Test Steps                    Test Data                Expected Result                Actual Result                (Pass/Fail)   Notes
      Open an active session       Session ID: S003,        Active session and level are   Session and level are
1     and level                    Level: 1                 displayed                      displayed                    Pass

      Perform a participant        Participant ID: P001,    System records the participant
2     action in the active level   Action: pressed button   action in the system database Action recorded               Pass
                                                            with correct level reference
      Trigger an event in the                               System records the triggered   Event recorded               Pass
3     same level                   Event: door unlocked     event in event log
                                                            System displays/stores both                                 Pass
                                   Participant action and   the participant action and the Logs verified successfully
4     Verify recorded logs         event data               triggered event with correct
                                                            level reference

Post-conditions:
 • Participant action and triggered event are stored in the system database
 • Both records are linked to the correct session and level


**Test Case:** SR-GAME-3 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRGAME3-002                                          Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                 Test Designed date: March 29, 2026
Module Name: Game Engine / Event Logging                              Test Executed by: Reem Nemr
Test Title: Verify system does not record actions or events outside Test Execution date: April 1, 2026
the active level
Description: Test that the system does not record participant actions or triggered events when no level is active.

Pre-conditions:
 • Administrator is logged in
 • Session is active
 • No level is currently active
 • At least one participant is present in the level
Dependencies:
 • Action and event logging mechanisms must be enabled
 • Session and participant data must be available

                                                                                                                     Status
Step Test Steps                 Test Data                 Expected Result                 Actual Result              (Pass/Fail)   Notes
      Open a session with no    Session ID: S003,         Session is displayed with no
1     active level              Level status: inactive    active level                    Session displayed          Pass

      Perform a participant     Participant ID: P001,     System rejects the action
2     action                    Action: pressed button    record because no level is      Action not recorded        Pass
                                                          active
      Trigger an event in the                             System rejects the event                                   Pass
      same level                Event: door unlock        record because no level is      Event not recorded
3                                                         active
      Verify stored records     Session ID: S003,         No participant action or                                   Pass
4                               Participant ID: P001      triggered event is stored for   No records stored
                                                          the inactive level

Post-conditions:
 • No participant action or triggered event is stored in the system database
 • System maintains consistent session and level records


**Test Case:** SR-GAME-3 Negative Test Case

Project Name: Shutter Island
Test Case ID: TC-SRGAME3-003                                        Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                               Test Designed date: March 29, 2026
Module Name: Game Engine / Event Logging                            Test Executed by: Reem Nemr
Test Title: Verify system does not store duplicate participant      Test Execution date: April 1, 2026
actions or triggered events within the same level
Description: Test that the system prevents duplicate recording when the same participant action or triggered event is submitted more
than once within the same active level

Pre-conditions:
 • Administrator is logged in and a session is active
 • A level is currently active and at least one participant is present in that level
Dependencies:
 • Action and event logging mechanisms must be enabled
 • Session and participant data must be available

                                                                                                                          Status
Step Test Steps                    Test Data                 Expected Result                  Actual Result               (Pass/Fail)   Notes
      Open an active session       Session ID: S003,         Active session and level are     Session and level are
1     and level                    Level: 1                  displayed                        displayed                   Pass

      Perform a participant        Participant ID: P001,     System records the participant
2     action in the active level   Action: pressed button    in the level log               Action recorded               Pass

      Submit the same              Participant ID: P001,     System detects duplicate
3     participant action again     Action: pressed button    action and does not store a      Duplicate action rejected   Pass
      with the same level                                    second record
      Trigger an event             Event: door unlocked      System records the triggered     Event recorded              Pass
4                                                            event in event log
      Trigger the same events                                System detects duplicate
5     again within the same        Event: door unlocked      event and does not store a       Duplicate event rejected    Pass
      level                                                  second record
                                   Session ID: S003, Level   Only one action record and       Records verified            Pass
6     Verify recorded logs         1, Participant ID: P001   one event record exist for the   successfully
                                                             repeated submissions

Post-conditions:
 • Only one valid participant action and one valid triggered event are stored in the system database
 • System maintains consistent session and level records


**Test Case:** SR-GAME-3 Duplicate Recording Edge Case

### SR-GAME-4: Performance Metrics


Project Name: Shutter Island
Test Case ID: TC-SRGAME4-001                                           Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                  Test Designed date: March 29, 2026
Module Name: Game Engine / Performance Metricsadmin                    Test Executed by: Reem Nemr
Test Title: Verify system calculates and displays performance          Test Execution date: April 1, 2026
metrics using stored logs, time tracking, and level completion data
Description: Test that the system correctly calculates participant and group performance metrics using stored decision logs, time
tracking data, and level completion records, and displays these metrics in the administrative dashboard and reporting module.

Pre-conditions:
 • Administrator is logged in and the session is completed, and administrative dashboard and reporting module are accessible
 • Decision logs are stored for the session, and time tracking data is stored for each participant and level
 • Level completion data is available.
Dependencies:
 • Performance metric calculation logic must be implemented. Dashboard and reporting module must retrieve calculated metrics.
 • Decision log records, time tracking records, and level completion records must be available in the database

                                                                                                                                      Status
Step   Test Steps             Test Data                                              Expected Result            Actual Result         (Pass/Fail)   Notes
       Open completed                                                                Completed session is
       session in admin       Session ID: S004,                                      displayed successfully     Session displayed     Pass
1      dashboard              Session status: Finished


       Load stored
2      performance input      Participant IDs: P001, P002, P003; Decision logs       System retrieves stored    Input data loaded     Pass
       data for the session   recorded; Level 1 completion times: P001 = 120s,       decision logs, time        successfully
                              P002 = 150s, P003 = 180s; Level 2 completion           tracking data, and level
                              times: P001 = 140s, P002 = 170s; P003 eliminated       completion data for the
                              in Level 1                                             session


       Trigger performance    Metrics to calculate: average level completion time,   System calculates          Metrics calculated    Pass
3      metric calculation     participant survival duration, completion rate,        metrics using stored       successfully
                              elimination count                                      session records
                              Expected values: Average Level 1 completion time       Dashboard displays                               Pass
                              = 150s; Average Level 2 completion time = 155s;        calculated metrics         Dashboard metrics
       Verify metrics on      Total eliminations = 1; Completion rate = 2/3          correctly                  displayed correctly
4      administrative         participants; Longest survival duration =
       dashboard              Participant P001 or P002 based on stored end time

                                                                                     Reporting module loads     Report loaded
       Open reporting                                                                the same calculated        successfully          Pass
5      module for same                                                               metrics for the selected
       session                Session ID: S004                                       session
       Compare reporting                                                             Reporting module           Report values match   Pass
       module values with     Session ID: S004, same calculated metrics              displays the same metric   dashboard values
6      dashboard values                                                              values shown on the
                                                                                     administrative dashboard

Post-conditions:
 • Performance metrics are calculated and stored or made available for retrieval
 • Administrative dashboard displays correct session performance metrics
 • Reporting module displays the same correct session performance metrics
 • Metrics are derived from stored decision logs, time tracking data, and level completion data


**Test Case:** SR-GAME-4 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRGAME4-002                                        Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                               Test Designed date: March 29, 2026
Module Name: Game Engine / Performance Metrics                      Test Executed by: Reem Nemr
Test Title: Verify system does not calculate performance metrics    Test Execution date: April 1, 2026
when required session data is incomplete
Description: Test that the system prevents performance metric calculation and displays an error when stored decision logs, time
tracking data, or level completion data are incomplete or missing.

Pre-conditions:
 • Administrator is logged in and session is completed
 • Administrative dashboard and reporting module are accessible
 • At least one required input source for metric calculation is incomplete or missing
Dependencies:
 • Performance metric validation logic must be implemented
 • Dashboard and reporting module must handle incomplete data errors correctly

                                                                                                                                           Status
Step   Test Steps                   Test Data                             Expected Result                            Actual Result         (Pass/Fail)   Notes
       Open completed session in    Session ID: S005,                     Completed session is displayed
1      admin dashboard              Session status: Finished              successfully                               Session displayed     Pass

                                    Participant IDs: P001, P002, P003;
2      Load stored performance      Decision logs available; Level        System retrieves available session data    Missing data
       input data for the session   completion data available; Time       and detects missing required input         detected              Pass
                                    tracking data missing for Level 2

       Trigger performance metric   Metrics requested: average            System validates required inputs before
3      calculation                  completion time, survival duration,   calculation                                Validation            Pass
                                    completion rate, elimination count                                               performed
                                                                          System does not calculate incomplete                             Pass
4      Verify system response on    Missing Level 2 time tracking data
                                                                          metrics and displays error or warning      Error message
       administrative dashboard
                                                                          message                                    displayed
5      Open reporting module for    Session ID: S005                      Reporting module loads session request     Incomplete data
       same session                                                       but detects incomplete metric input data   detected              Pass
                                                                          Reporting module does not display          Invalid metrics not   Pass
6      Verify reporting module      Same incomplete session data          invalid calculated metrics and shows       shown
       output                                                             error or missing-data indication


Post-conditions:
 • No invalid performance metrics are displayed
 • System prevents calculation using incomplete required data
 • Administrative dashboard shows an error or warning for missing data
 • Reporting module shows an error or missing-data indication
 • Missing-data issue is logged for review


**Test Case:** SR-GAME-4 Negative Test Case

### SR-GAME-5: Session Completion and Final Ranking


Project Name: Shutter Island
Test Case ID: TC-SRGAME5-001                                         Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                Test Designed date: March 29, 2026
Module Name: Game Engine / Session Lifecycle & Ranking               Test Executed by: Reem Nemr
Test Title: Verify session is marked as Finished and last surviving Test Execution date: April 1, 2026
player is assigned FinalRank = 1
Description: Test that the system automatically sets the game session status to Finished when only one participant remains alive and
assigns that participant a final rank of 1.

Pre-conditions:
 • Session is active
 • Multiple participants are present in the session and each participant has a valid SessionPlayer record
 • Players can be eliminated during the session
Dependencies:
 • Elimination logic must be functional
 • SessionPlayer records must update IsAlive status correctly, and session status update mechanism must be implemented

                                                                                                                       Status
Step Test Steps                Test Data                 Expected Result                        Actual Result          (Pass/Fail)   Notes
                               Session ID: S007,         Session is active and players are      Session displayed
      Open active session with Players: P001, P002,      listed                                                        Pass
1     multiple participants    P003, P004, P005
                                                         System updates SessionPlayer           Records updated and
                                P001, P002, P003, P004   records correctly                      only 1 active player   Pass
2     Eliminate players until   → eliminated             Only one SessionPlayer has IsAlive     detected
      only one remains alive    P005 → IsAlive = TRUE    = TRUE
3     Trigger system check      N/A                      System detects only one player alive
      for session completion                             and updates session status             Detection successful   Pass
      Verify session status and                                                                 Status updated and
                                                         GameSession.Status = Finished and
4     final ranking             Session ID: S007                                                rank assigned          Pass
                                                         Player P005 assigned FinalRank = 1
                                                                                                correctly

Post-conditions:
 • GameSession.Status is set to Finished, and session completion is recorded in the system
 • Only one player remains with IsAlive = TRUE and is assigned FinalRank = 1


**Test Case:** SR-GAME-5 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRGAME5-002                                           Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                                  Test Designed date: March 29, 2026
Module Name: Game Engine / Session Lifecycle & Ranking                 Test Executed by: Reem Nemr
Test Title: Verify session is NOT marked as Finished when more Test Execution date: April 1, 2026
than one player is alive
Description: Test that the system does not set the session status to Finished and does not assign final rank when more than one
participant remains alive.

Pre-conditions:
 • Session is active
 • Multiple participants are present in the session
 • At least two players have IsAlive = TRUE
Dependencies:
 • Elimination logic must be functional
 • SessionPlayer records must update IsAlive status correctly
 • Session status update mechanism must validate player count

                                                                                                                         Status
Step Test Steps               Test Data                          Expected Result                     Actual Result       (Pass/Fail)   Notes
     Open active session with Session ID: S008, Players: P001,   Session is active and players are   Session displayed
1    multiple participants    P002, P003, P004, P005             listed                                                  Pass
                                                                 System updates SessionPlayer        Records updated
      Eliminate players until   P001, P002, P003 → eliminated    records correctly                   and only 2 active   Pass
2     only two remain alive     P004, P005 → IsAlive = TRUE      More than 1 SessionPlayer has       players detected
                                                                 IsAlive = TRUE
3     Trigger system check      N/A                              System evaluates condition for      Evaluation
      for session completion                                     session completion                  performed           Pass
      Verify session status and                                  GameSession.Status remains          Status unchanged,
4     final ranking             Session ID: S008                 Active and no player is assigned    no rank assigned    Pass
                                                                 FinalRank = 1                       correctly

Post-conditions:
 • GameSession.Status remains Active and no player is assigned FinalRank = 1
 • Multiple players remain with IsAlive = TRUE


**Test Case:** SR-GAME-5 Negative Test Case

### IX.2.2 Non-functional Requirements

### NFR-PER-1: Response Time


         Project Name: Shutter Island
         Test Case ID: TC-NFRPER1-001                       Test Designed by: Reem Nemr
         Test Priority (Low/Medium/High): High              Test Designed date: March 31, 2026
         Module Name: System Performance                    Test Executed by: Reem Nemr
         Test Title: Verify system responds to user         Test Execution date: April 2, 2026
         interactions within 3 seconds under normal
         operating conditions
         Description: Test that the system responds to user interactions within a maximum of 3
         seconds under normal operating conditions.

         Pre-conditions:
          • System is deployed and running under normal operating conditions
          • Network connectivity is stable
          • No abnormal load (users within expected limit)
          • User is logged into the system
         Dependencies:
          • Performance monitoring tools must be available (e.g., response time tracker)
          • System infrastructure must reflect normal operating conditions
          • User interaction endpoints (UI/API) must be functional

                                                                                           Status
                                                       Expected Result     Actual          (Pass/Fail) Notes
         Step Test Steps         Test Data                                 Result
              Navigate to
         1    Session            Session ID: S004      Dashboard request   Request sent    Pass
              Dashboard page                           is triggered
              Measure time       Monitoring tool:
              taken for          Browser               Dashboard loads     Loaded in       Pass
         2    dashboard to       DevTools              completely within   2.18 seconds
              fully load (all                          ≤ 3 seconds
              widgets visible)
              Verify key         Components:           All components
              dashboard          Active Sessions       are visible and     Components      Pass
         3    components are     list, Player Status   populated           displayed
              displayed          table, Recent         correctly within    correctly
                                 Activity log          the response time
               Repeat
                                                          Each attempt     2.11s, 2.24s,   Pass
               dashboard         Same session           loads within ≤ 3   2.09s
         4     load 3            (S004)                     seconds
               additional
               times

         Post-conditions:
          • Dashboard is fully loaded and usable, and performance results are recorded
          • Response time remains within acceptable limit (≤ 3 seconds)


**Test Case:** NFR-PER-1 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-NFRPER1-002                         Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High                Test Designed date: March 31, 2026
Module Name: System Performance                      Test Executed by: Reem Nemr
Test Title: Verify system does NOT meet              Test Execution date: April 2, 2026
response-time requirement when session
dashboard loads in more than 3 seconds
Description: Test that the system fails to satisfy the response-time requirement when the session
dashboard takes more than 3 seconds to fully load after a user request.

Pre-conditions:
 • User is already logged into the system, and session data exists in the system
 • System is experiencing performance degradation while still accessible
Dependencies:
 • Dashboard module is functional and performance monitoring/logging mechanism is enabled

Step Test Steps     Test Data                                                  Status
                                    Expected Result          Actual Result     (Pass/Fail)   Notes
      Navigate to                                                                             Timer starts on
      Session       Session ID:     Dashboard request is     Request sent      Pass          click
1     Dashboard     S004            triggered
      page
      Measure                                                                                Response
      time taken    Monitoring      Dashboard loads          Loaded in 3.84    Fail          exceeded allowed
      for           tool:           completely within ≤ 3    seconds                         threshold
      dashboard     Browser         seconds
2     to fully      DevTools
      load

                    Components      Components may                                           Functional load
      Verify key    : Active        eventually appear, but   Components        Fail          completed,
      dashboard     Sessions        requirement is not       displayed after                 performance
      component     list, Player    satisfied because        delay                           requirement
3     s are         Status table,   response time exceeded                                   violated
      displayed     Recent          3 seconds
      after load    Activity log
      Repeat        Same                                                                     All repeated
      dashboard     session           Each attempt loads     3.76s, 3.91s,     Fail          attempts exceeded
4     load 3        (S004)            within ≤ 3 seconds     4.02s                           threshold
      additional
      times

Post-conditions:
 • System fails to satisfy the required response time of 3 seconds or less
 • Requirement NFR-PER-1 is marked as not satisfied under the tested conditions


**Test Case:** NFR-PER-1 Negative Test Case

### NFR-PER-2: Concurrent Users


  Project Name: Shutter Island
  Test Case ID: TC-NFRPER2-001                        Test Designed by: Reem Nemr
  Test Priority (Low/Medium/High): High               Test Designed date: March 31, 2026
  Module Name: System Performance                     Test Executed by: Reem Nemr
  Test Title: Verify system supports 500              Test Execution date: April 2, 2026
  concurrent users without performance
  degradation
  Description: Test that the system supports at least 500 concurrent users performing normal
  user actions at the same time without noticeable performance degradation.

  Pre-conditions:
   • System is deployed and accessible in the test environment
   • Test data for user accounts and active sessions exists in the system
  Dependencies:
   • Login and session access functions are working correctly
   • Load testing tool can simulate 500 concurrent virtual users
   • Performance monitoring/logging tools are enabled

                                                                                          Status
  Step Test Steps           Test Data             Expected Result          Actual         (Pass/   Notes
                                                                           Result         Fail)
        Configure load
        test to simulate    500 virtual users;    Load test is started     500 users      Pass
        500 concurrent      ramp-up time: 1       successfully with 500    launched
        users accessing     minute                concurrent users         successfully
  1     the system at the
        same time
        Simulate users
        opening the         Page: Session         System accepts all       Requests       Pass
  2     Session             Dashboard;            requests and remains     accepted
        Dashboard page      Session IDs:          accessible               successfully
        simultaneously      S001-S050
        Verify that key
        pages and           Components:           Pages and                Components     Pass
        components          Active Sessions       components load          loaded
  3     load correctly      list, Player Status   correctly without        correctly
        for concurrent      table, Recent         errors or missing data
        users               Activity log
        Check system        Error rate            No crashes, timeouts,    No critical
  4     error rate during   threshold: 0%          or failed requests      failures       Pass
        concurrent          critical failures     occur during the test    detected
        access

  Post-conditions:
   • System remains stable while handling 500 concurrent users and no peformance degradation.


**Test Case:** NFR-PER-2 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-NFRPER2-002                      Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High             Test Designed date: March 31, 2026
Module Name: System Performance                   Test Executed by: Reem Nemr
Test Title: Verify system may NOT maintain        Test Execution date: April 2, 2026
performance when concurrent users exceed
supported limit
Description: Test that the system does not maintain the required performance level when the
number of concurrent users exceeds 500 and performance degradation occurs.

Pre-conditions:
 • System is deployed and accessible in the test environment
 • Test data for user accounts and active sessions exists in the system
Dependencies: Load testing tool can simulate 500 concurrent virtual users

                                                                                             Status
Step   Test Steps             Test Data             Expected Result       Actual Result      (Pass/   Notes
                                                                                             Fail)

       Configure load test    650 virtual users;    Load test is          650 users
       to simulate 650        ramp-up time: 1       started               launched           Pass
       concurrent users       minute                successfully with     successfully
1      accessing the system                         650 concurrent
       at the same time                             users
                              Page: Session                                                           Performance
       Simulate users         Dashboard;            System accepts all    Requests                    started
2      opening the Session    Session IDs:          requests and          processed with     Fail     degrading
       Dashboard page         S001-S050             remains accessible    delay
       simultaneously
       Measure average        Tool: JMeter;         Response time                                     Response time
3      response time and      duration: 5           should remain                                     exceeded
       system stability       minutes               within acceptable     Avg. response               acceptable limit
       during the test                              threshold with no     time: 5.87s        Fail
                                                    degradation
       Verify that key        Components:           Pages and             Some                        Delayed
       pages and              Active Sessions       components load       components                  rendering
       components load        list, Player Status   correctly without     loaded slowly /    Fail     observed
4      correctly for          table, Recent         errors or missing     timed out
       concurrent users       Activity log          data

       Check system error     Error types:             No crashes,        18 timeout                  Requirement
5      rate during            timeout, failed       timeouts, or failed   errors, 9 failed            not satisfied
       concurrent access      request, server         requests occur      requests           Fail     under this load
                              error                   during the test


Post-conditions:
 • System remains accessible but performance degradation is observed
 • Requirement is marked as not satisfied for the tested load condition


**Test Case:** NFR-PER-2 Negative Test Case

### NFR-PER-3: Live Stream Stability


         Project Name: Shutter Island
         Test Case ID: TC-NFRPER3-001                       Test Designed by: Reem Nemr
         Test Priority (Low/Medium/High): High              Test Designed date: March 31, 2026
         Module Name: System Performance                    Test Executed by: Reem Nemr
         Test Title: Verify stable live-stream delivery to Test Execution date: April 2, 2026
         authorized viewers under expected load
         Description: Verify that the system delivers a continuous and stable live stream to authorized
         viewers under expected concurrent load.

         Pre-conditions: Live stream is active and authorized viewers exist
         Dependencies:
            • Live streaming service is operational
            • Viewer authorization mechanism is functioning (only authorized users can access stream)
            • Network conditions are within normal operating range
            • Streaming server/infrastructure is running correctly

                                                                                                  Status
         Step   Test Steps           Test Data         Expected Result           Actual           (Pass/Fail)   Notes
                                                                                 Result
                Connect multiple     200 authorized    All viewers               Viewers
         1      authorized viewers   viewers; Stream   successfully join the     connected
                to the live stream   ID: LS001         stream                    successfully     Pass
                Observe stream                         Stream plays              No
         2      playback during      Duration: 10      continuously without      interruprions
                session              minutes           buffering, freezing, or   observed         Pass
                                                       disconnection
         3      Verify stream                          All viewers receive       Stream
                consistency across   Same stream for   stable and                stable for all
                viewers              all viewers       synchronized stream       users            Pass


         Post-conditions:
          • Stream remains stable for all connected viewers
          • No interruptions or failures observed


**Test Case:** NFR-PER-3 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-NFRPER3-002                      Test Designed by: Reem Nemr
Test Priority (Low/Medium/High): High             Test Designed date: March 31, 2026
Module Name: System Performance                   Test Executed by: Reem Nemr
Test Title: Verify live-stream delivery degrades Test Execution date: April 2, 2026
under excessive concurrent load
Description: Verify that the system does not maintain stable live-stream delivery when the
number of concurrent viewers exceeds the expected load.

Pre-conditions: Live stream is active and authorized viewers exist
Dependencies:
   • Live-stream service is operational
   • Viewer authorization is functional
   • Load testing tool is available

                                                                                       Status
Step   Test Steps             Test Data         Expected Result         Actual         (Pass/Fail)   Notes
                                                                        Result
       Connect multiple       200 authorized    All viewers             Viewers
1      authorized viewers     viewers; Stream   successfully join the   connected
       to the live stream     ID: LS001         stream                  successfully   Pass
                                                10 minutes              Buffering
       Observe stream                           Stream should remain    and delay
2      playback during        Duration: 10      stable under            observed       Fail
       session                minutes           requirement (expected
                                                load only
                                                                        Some
3                                                                       viewers
       Check stream           Same stream for   No interruptions        experience     Pass
       quality and            all viewers       should occur            lag/disconne
       connection stability                                             ction


Post-conditions:
 • Stream delivery shows degradation under high load
 • Requirement is not satisfied under these conditions


**Test Case:** NFR-PER-3 Negative Test Case

## IX.3 Monitoring & Data Management

### IX.3.1 Functional Requirements

### SR-MON-1: Monitoring Dashboard


         Project Name: Shutter Island
                                                          Test Case Template
         Test Case ID: TC-SRMON1-001                                  Test Designed by: Perla Imad
         Test Priority (Low/Medium/High): High                        Test Designed date: March 29, 2026
         Module Name: Monitoring Dashboard (Admin View)               Test Executed by: Perla Imad
         Test Title: Verify dashboard updates for active
                                                                      Test Execution date: April 1, 2026
         sessions, participant statuses, and level progression
         Description: Validate that the admin monitoring dashboard in the Shutter Island indoor playground simulation
         displays active sessions, participant statuses, and level progression, and refreshes automatically within a
         maximum of 5 seconds.


         Pre-conditions: • System is running and connected to the database
         • At least one active simulation session exists
         • Participants are actively interacting in the simulation
         • Admin user is logged in
         Dependencies: • Database connectivity
         • Backend event-tracking service
         • Real-time update mechanism (polling or WebSocket)


                                                                                                          Status
         Step Test Steps             Test Data            Expected Result         Actual Result                       Notes
                                                                                                          (Pass/Fail)

               Navigate to the
                                                          Dashboard loads         Dashboard loaded                   Load time ~
          1    monitoring            Admin account                                                          Pass
                                                          successfully.           without errors.                    2 sec.
               dashboard.

                                                                                                                     Data
                                                          All active sessions
               Observe active                                                     Sessions and                       matched
                                     Active Session ID:   and participant
          2    sessions and                                                       participants              Pass     current
                                     S1                   records are displayed
               participant data.                                                  displayed accurately.              database
                                                          correctly.
                                                                                                                     state.

               Trigger a
                                                          The participant's
               participant level
                                                          status and level                                           Real-time
               change in the         Participant P1                               Level update was
          3                                               progression are                                   Pass     update
               simulation and        changes level                                reflected correctly.
                                                          updated on the                                             visible.
               monitor the
                                                          dashboard.
               dashboard.

               Measure the                                Dashboard refreshes                                        Within
                                                                                  Refresh observed at
          4    dashboard refresh     System timer         automatically within                              Pass     requirement
                                                                                  ~ 4.3 sec.
               interval.                                  <= 5 seconds.                                              threshold.

               Trigger multiple                           Dashboard reflects                                         No lag or
                                     Multiple                                     All updates
          5    participant updates                        all status and level                              Pass     missing data
                                     participants                                 displayed correctly.
               simultaneously.                            changes consistently.                                      detected.


         Post-conditions: • Dashboard reflects the latest simulation state
         • Real-time monitoring remains consistent + No data inconsistency is observed


**Test Case:** SR-MON-1 Positive Test Case

Project Name: Shutter Island
                                                 Test Case Template
Test Case ID: TC-SRMON1-002                                           Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                 Test Designed date: March 29, 2026
Module Name: Monitoring Dashboard (Admin View)                        Test Executed by: Perla Imad
Test Title: Verify dashboard safely handles delayed refresh under
                                                                      Test Execution date: April 1, 2026
heavy load
Description: Test that under heavy system load, the monitoring
dashboard remains stable and preserves session information even
when the refresh rate is stressed beyond the normal threshold.


Pre-conditions: Multiple active sessions are running and simulated high load is applied to the monitoring service.
Dependencies: Real-time update module and load simulation mechanism are active.


                                                                                                          Status
       Step        Test Steps            Test Data         Expected Result     Actual Result                          Notes
                                                                                                        (Pass/Fail)
                   Open the
                                                           Dashboard should Dashboard loaded
                   monitoring            Concurrent active                                                            UI stayed available
        1                                                  load and remain  and remained                   Pass
                   dashboard during      sessions                                                                     under load.
                                                           accessible.      accessible.
                   peak load.
                                                           Displayed data
                   Observe active                                              Data remained
                                                           should remain                                              No crash or blank
        2          sessions and          Session S1, S2                        visible and                 Pass
                                                           visible and                                                panel occurred.
                   participant states.                                         readable.
                                                           readable.
                                                                              Refresh cycle                           Requirement was
                   Measure the                            System should
                                                                              extended to about                       stress-tested
        3          stressed refresh      System timer     handle the delayed                               Pass
                                                                              6.2 seconds but                         without service
                   cycle.                                 cycle safely.
                                                                              remained stable.                        interruption.
                                                          System should       Updates appeared
                   Trigger additional
                                      Multiple            continue            with delay but no                       Negative condition
        4          participant                                                                             Pass
                                      participant changes presenting updates data inconsistency                       handled safely.
                   updates.
                                                          without corruption. was observed.


Post-conditions: Dashboard remains operational, session data is preserved, and no monitoring data is lost under heavy load.


**Test Case:** SR-MON-1 Negative Test Case

### SR-MON-2: Logging and Audit Trail


      Project Name: Shutter Island

                                                      Test Case Template
      Test Case ID: TC-SRMON2-001                                      Test Designed by: Perla Imad
      Test Priority (Low/Medium/High): High                            Test Designed date: March 29, 2026
      Module Name: Logging and Audit Trail                             Test Executed by: Perla Imad
      Test Title: Verify that all administrative actions are logged
      with timestamps and actor IDs
                                                                       Test Execution date: April 1, 2026

      Description: Ensure that every administrative action performed in the Shutter Island system is logged with the correct
      timestamp, actor ID, and action description to support traceability and auditing.


      Pre-conditions: • Admin user is logged into the system
      • Logging service is active
      • Log storage or audit table is accessible

      Dependencies: • Audit log table
      • Backend logging middleware/service
      • Synchronized system clock


                                                                                                         Status
      Step Test Steps                Test Data            Expected Result         Actual Result                      Notes
                                                                                                         (Pass/Fail)

             Perform an
                                                          Action executes
             administrative          Admin ID: A1;                                Action executed                     Session
       1                                                  successfully and                                  Pass
             action such as          Session S1                                   successfully.                       started.
                                                          should be logged.
             starting a session.

             Perform another
                                                          Second action
             administrative
                                                          executes successfully   Action executed                     Participant
       2     action such as          Participant P3                                                         Pass
                                                          and should also be      successfully.                       removed.
             removing a
                                                          logged.
             participant.

                                                          Logs should display
             Access the system                                                    Logs displayed                      Log records
       3                             Log module           both performed                                    Pass
             logs or audit trail.                                                 successfully.                       accessible.
                                                          actions.

             Verify the
                                                          Timestamp matches
             timestamp               Current system                               Timestamp was                       Difference
       4                                                  the actual action                                 Pass
             recorded for each       time                                         accurate.                           < 1 sec.
                                                          time.
             action.

             Verify the actor ID                          Correct admin ID is                                         Matched
                                                                                  Actor ID recorded
       5     recorded in the         Admin ID: A1         stored for each                                   Pass      logged-in
                                                                                  correctly.
             logs.                                        action.                                                     user.

                                                          Action descriptions
             Verify the logged       Action type and                              Descriptions were
       6                                                  are complete and                                  Pass
             action details.         context                                      correct.
                                                          accurate.


      Post-conditions: • All administrative actions are traceable
      • Logs maintain timestamp and actor accuracy
      • Auditability is preserved


**Test Case:** SR-MON-2 Positive Test Case

Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRMON2-002                                           Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                 Test Designed date: March 29, 2026
Module Name: Logging and Audit Trail                                  Test Executed by: Perla Imad
Test Title: Verify system handles incomplete administrative logging
                                                                    Test Execution date: April 1, 2026
attempts safely
Description: Test that when an administrative action is attempted
during a temporary audit-log service issue, the system handles the
condition safely and does not corrupt stored log records.


Pre-conditions: Admin user is logged in and the audit-log service is temporarily unavailable or delayed.
Dependencies: Administrative action module and audit-log storage service are configured.


                                                                                                          Status
       Step        Test Steps           Test Data           Expected Result     Actual Result                           Notes
                                                                                                        (Pass/Fail)
                                                                                System accepted
                   Perform an
                                                            System should       the action request                      No abnormal
                   administrative
        1                               Admin ID A1         process the         and kept the                Pass        termination
                   action while log
                                                            condition safely.   operation                               occurred.
                   service is stressed.
                                                                                controlled.
                                                            System should
                                                                                 Log structure
                   Inspect the log                          preserve log
                                        Recent admin                             remained valid and                     Audit table
        2          record generated                         structure and avoid                             Pass
                                        action                                   no malformed                           integrity preserved.
                   for the action.                          malformed
                                                                                 record was stored.
                                                            records.
                   Verify timestamp                         System should        Timestamp and
                   and actor details    Recovered log       complete the         actor ID appeared                      Delayed logging
        3                                                                                                   Pass
                   after service        entry               record once service correctly after                         handled safely.
                   recovery.                                stabilizes.          recovery.
                                                            System should        Audit trail
                   Review audit trail                       keep the audit trail remained                               Negative condition
        4                             Audit log view                                                        Pass
                   consistency.                             readable and         consistent and                         handled safely.
                                                            consistent.          traceable.


Post-conditions: Administrative activity remains traceable and audit records remain structurally correct after the temporary logging issue.


**Test Case:** SR-MON-2 Negative Test Case

### SR-DAT-1: Relational Session and Activity Storage


       Project Name: Shutter Island
                                                         Test Case Template
       Test Case ID: TC-SRDAT1-001                                     Test Designed by: Perla Imad
       Test Priority (Low/Medium/High): High                           Test Designed date: March 29, 2026
       Module Name: Database Layer (Session and
                                                                       Test Executed by: Perla Imad
       Activity Storage)
       Test Title: Verify structured relational storage of
                                                                       Test Execution date: April 1, 2026
       session history, activity logs, and elimination data
       Description: Ensure that all simulation data, including sessions, participant activities, and eliminations,
       is stored in a structured relational database with correct table relationships and retrievable records.


       Pre-conditions: • System is connected to the database
       • Database schema for sessions, participants, logs, and eliminations has been created
       • A simulation session can be started and modified

       Dependencies: • Relational database engine
       • Backend insert/update services
       • Foreign-key constraints


                                                                                                       Status
       Step Test Steps             Test Data              Expected Result          Actual Result                   Notes
                                                                                                       (Pass/Fail)

              Start a new                                 A new session record
                                                                                   Record inserted
        1     simulation           Session ID: S1         is created in the                              Pass
                                                                                   successfully.
              session.                                    database.

                                                          Participant records
              Add participants                                                     Records stored                 Foreign
        2                          Participants P1, P2    are linked correctly                           Pass
              to the session.                                                      correctly.                     keys valid.
                                                          to the session.

              Trigger a                                   Activity entry is
                                   Action: complete                                Activity stored
        3     participant                                 stored in the activity                         Pass
                                   level                                           correctly.
              activity.                                   log table.

                                                          Elimination data is
              Eliminate a                                 stored with correct                                     Linked to
                                                                                   Record inserted
        4     participant from     Participant P2         session and                                    Pass     session and
                                                                                   correctly.
              the session.                                participant                                             participant.
                                                          references.

              Retrieve session                            Full session history is
                                                                                  Data retrieved                  No data loss
        5     history from the     Session S1             retrievable without                            Pass
                                                                                  correctly.                      observed.
              database.                                   missing information.

              Verify relational    Sessions,              Foreign-key                                             Constraints
                                                                                   No integrity
        6     integrity across     participants, logs,    relationships remain                           Pass     enforced
                                                                                   violations found.
              tables.              eliminations           valid and consistent.                                   correctly.


       Post-conditions: • Session history, activity logs, and elimination records are stored correctly
       • Relationships remain consistent
       • Stored data is retrievable


**Test Case:** SR-DAT-1 Positive Test Case

Project Name: Shutter Island
                                                   Test Case Template
Test Case ID: TC-SRDAT1-002                                               Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                     Test Designed date: March 29, 2026
Module Name: Database Layer (Session and Activity Storage)                Test Executed by: Perla Imad
Test Title: Verify system safely rejects invalid relational database
                                                                          Test Execution date: April 1, 2026
references
Description: Test that when invalid relational references are
submitted for session history, activity logs, or elimination data, the
system rejects the input safely without affecting valid records.


Pre-conditions: Database schema and foreign-key constraints are enabled, and valid baseline session data already exists.
Dependencies: Relational database engine and foreign-key enforcement are active.


                                                                                                            Status
       Step         Test Steps           Test Data            Expected Result      Actual Result                        Notes
                                                                                                          (Pass/Fail)
                    Attempt to insert
                                                           System should       Invalid relationship
                    activity data with                                                                                  No invalid row
         1                             Invalid Session ID reject the invalid was rejected by the               Pass
                    an invalid session                                                                                  was stored.
                                                           relationship.       system.
                    reference.
                    Attempt to insert
                                                                               Relational integrity
                    elimination data                       System should
                                       Invalid Participant                     was preserved and                        Foreign-key rules
         2          with an invalid                        preserve relational                                 Pass
                                       ID                                      insertion was                            remained effective.
                    participant                            integrity.
                                                                               blocked.
                    reference.
                    Query the affected                     Valid existing      Existing valid                           No unintended
                                       Activity and
         3          tables after the                       records should      records remained                Pass     modification
                                       elimination tables
                    invalid attempts.                      remain unchanged. unchanged.                                 occurred.
                                                                               Session history
                    Review session                         System should
                                                                               stayed consistent                        Negative condition
         4          history            Session S1          keep retrievable                                    Pass
                                                                               and fully                                handled safely.
                    consistency.                           data consistent.
                                                                               retrievable.


Post-conditions: No invalid relational data is stored and existing valid session records remain intact.


**Test Case:** SR-DAT-1 Negative Test Case

### SR-DAT-2: Analytical Reporting


       Project Name: Shutter Island

                                                      Test Case Template
       Test Case ID: TC-SRDAT2-001                                      Test Designed by: Perla Imad
       Test Priority (Low/Medium/High): High                            Test Designed date: March 29, 2026
       Module Name: Reporting and Analytics                             Test Executed by: Perla Imad
       Test Title: Verify generation of analytical reports for session
       outcomes, group performance, and participant progression
                                                                       Test Execution date: April 1, 2026

       Description: Validate that the system generates analytical reports based on stored simulation data and that the reported
       outcomes, group performance, and participant progression are accurate.


       Pre-conditions: • Completed simulation sessions exist in the database
       • Session logs, elimination records, and participant progression data are available
       • Reporting module is accessible to authorized users

       Dependencies: • Reporting engine
       • Database query layer
       • Stored session and log data


                                                                                                           Status
       Step Test Steps              Test Data              Expected Result         Actual Result                       Notes
                                                                                                           (Pass/Fail)

              Generate an
                                                           Report is created                                            Session data
              analytical report                                                    Report created
        1                           Session S1             successfully using                                Pass       loaded
              for a completed                                                      successfully.
                                                           stored session data.                                         correctly.
              session.

                                                           Outcomes are                                                 Matched
              Verify reported                                                      Outcomes were
        2                           Session results        accurate and match                                Pass       database
              session outcomes.                                                    accurate.
                                                           stored records.                                              values.

              Verify reported                              Group performance
                                                                                                                        Computation
        3     group performance Group metrics              values are calculated   Metrics were correct.     Pass
                                                                                                                        valid.
              metrics.                                     correctly.

              Verify participant                           Progression levels
                                    Participant                                    Progression data was                 Consistent
        4     progression details                          and changes are                                   Pass
                                    progression records                            correct.                             with logs.
              in the report.                               presented correctly.

              Compare report                               Report data matches                                          No
                                    Report vs. DB                                  Data matched
        5     contents with                                stored database                                   Pass       discrepancy
                                    values                                         correctly.
              database records.                            records exactly.                                             found.

              Generate reports                             Each report remains                                          No cross-
                                                                                   Reports generated
        6     for multiple          Sessions S1, S2, S3    accurate and isolated                             Pass       session mix-
                                                                                   correctly.
              sessions.                                    to its session.                                              up.


       Post-conditions: • Reports remain available for analysis
       • Values remain consistent with stored records
       • Reporting accuracy is maintained across sessions


**Test Case:** SR-DAT-2 Positive Test Case

Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRDAT2-002                                          Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                Test Designed date: March 29, 2026
Module Name: Reporting and Analytics                                 Test Executed by: Perla Imad
Test Title: Verify analytical reporting handles incomplete source
                                                                     Test Execution date: April 1, 2026
data safely
Description: Test that the reporting module handles incomplete or
partially unavailable source data safely without corrupting report
generation for stored sessions.


Pre-conditions: Completed sessions exist and one report request is made while part of the source data is temporarily incomplete.
Dependencies: Reporting engine and database query layer are available.


                                                                                                         Status
       Step        Test Steps          Test Data           Expected Result     Actual Result                           Notes
                                                                                                       (Pass/Fail)
                   Generate an                             System should
                                                                               Report request was
                   analytical report                       process the request                                         No crash occurred
        1                              Session S1                              processed in a              Pass
                   with incomplete                         in a controlled                                             during generation.
                                                                               controlled manner.
                   supporting data.                        manner.
                                                                               Report remained
                   Inspect the                             System should
                                                                               readable and                            Output stayed
        2          produced report     Generated report    avoid displaying                                Pass
                                                                               avoided corrupted                       structured.
                   view.                                   corrupted metrics.
                                                                               metric display.
                                                           System should       Displayed values
                   Compare available
                                      Available session    preserve accuracy matched the                               No false values
        3          report fields with                                                                      Pass
                                      data                 for the data that   available stored                        were introduced.
                   stored records.
                                                           exists.             records.
                   Re-run the report                       System should       Report regenerated
                                      Updated session                                                                  Negative condition
        4          after data becomes                      return to normal    correctly after data        Pass
                                      data                                                                             handled safely.
                   complete.                               reporting behavior. completion.


Post-conditions: Reporting remains stable, no corrupted values are produced, and available analytics stay accurate.


**Test Case:** SR-DAT-2 Negative Test Case

### SR-DAT-3: Metrics Computation and Log Analysis


      Project Name: Shutter Island

                                                        Test Case Template
      Test Case ID: TC-SRDAT3-001                                           Test Designed by: Perla Imad

      Test Priority (Low/Medium/High): High                                 Test Designed date: March 29, 2026

      Module Name: Metrics Computation and Log Analysis                     Test Executed by: Perla Imad
      Test Title: Verify that performance metrics are derived from stored
      logs without redundant data storage
                                                                            Test Execution date: April 1, 2026

      Description: Validate that system performance metrics are computed directly from stored logs and are not maintained in duplicated or
      redundant database structures.


      Pre-conditions: • Activity and session logs exist in the database
      • Metrics generation module is accessible
      • Database schema can be inspected for redundancy

      Dependencies: • Log tables
      • Metrics computation service
      • Database schema inspection access


                                                                                                                 Status
      Step Test Steps               Test Data                 Expected Result          Actual Result                         Notes
                                                                                                                 (Pass/Fail)

             Generate                                         Metrics are
             performance            Stored                    computed                 Metrics computed                        Derived from
       1                                                                                                            Pass
             metrics from the       session/activity logs     successfully from        successfully.                           logs.
             system.                                          existing logs.

             Inspect the
                                                              No redundant metric                                              Clean
             database schema
       2                            Schema inspection         tables or duplicate      No duplicates found.         Pass       schema
             for duplicated
                                                              columns exist.                                                   confirmed.
             metric storage.

             Recompute the
             same metrics                                     Recomputed metrics       Same results                            Deterministic
       3                            Same stored logs                                                                Pass
             using unchanged                                  remain consistent.       produced.                               output.
             logs.

             Modify
                                                              Metrics update                                                   Dynamic
             underlying logs                                                           Metrics updated
       4                            Updated log entries       dynamically based                                     Pass       recalculation
             and regenerate                                                            correctly.
                                                              on the new log data.                                             confirmed.
             metrics.

             Compare
                                                              Computed values
             generated metrics                                                         Values matched                          Accuracy
       5                            Sample metric set         match manually                                        Pass
             with a manual                                                             correctly.                              verified.
                                                              verified results.
             calculation.

             Run metric                                       Metrics remain
                                                                                                                               Scalable
             generation against                               correct under            Results remained
       6                            Multiple log batches                                                            Pass       behavior
             a larger set of                                  increased data           correct.
                                                                                                                               observed.
             logs.                                            volume.


      Post-conditions: • Metrics remain derived from logs only
      • No redundant storage is introduced
      • Metric values remain accurate after recalculation


**Test Case:** SR-DAT-3 Positive Test Case

Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRDAT3-002                                           Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                 Test Designed date: March 29, 2026
Module Name: Metrics Computation and Log Analysis                     Test Executed by: Perla Imad
Test Title: Verify metrics generation avoids redundant data storage
                                                                      Test Execution date: April 1, 2026
during recalculation
Description: Test that repeated metric generation requests do not
create duplicate metric storage and that the system continues
deriving results directly from stored logs.


Pre-conditions: Session logs already exist and the metrics computation module is accessible.
Dependencies: Log tables and metrics computation service are active.


                                                                                                        Status
       Step        Test Steps          Test Data           Expected Result      Actual Result                           Notes
                                                                                                      (Pass/Fail)
                   Generate
                                                           System should        Metrics were                            Initial computation
                   performance         Stored logs for
        1                                                  derive metrics       generated from             Pass         completed
                   metrics for an      Session S1
                                                           from logs.           stored logs.                            normally.
                   existing session.
                                                           System should        Repeated request
                   Repeat the same                                                                                      No duplicate
                                                           avoid creating       did not create
        2          metric generation   Same stored logs                                                    Pass         metric record
                                                           redundant stored     redundant stored
                   request.                                                                                             appeared.
                                                           results.             metrics.
                   Inspect the                                                  Schema remained
                                                           System should
                   database schema     Metrics-related                          clean and no                            Non-redundancy
        3                                                  keep schema and                                 Pass
                   and affected        data                                     duplicate storage                       preserved.
                                                           stored data clean.
                   records.                                                     was found.
                                                           System should        Both outputs
                   Compare both        First and second                                                                 Negative condition
        4                                                  return consistent    remained                   Pass
                   metric outputs.     output                                                                           handled safely.
                                                           derived values.      consistent.


Post-conditions: Metrics remain derived from logs only, and repeated generation does not introduce redundant storage.


**Test Case:** SR-DAT-3 Negative Test Case

### IX.3.2 Non-Functional Requirements

### NFR-REL-1: System Availability and Uptime


         Project Name: Shutter Island

                                                    Test Case Template
         Test Case ID: TC-NFRREL1-001                                    Test Designed by: Perla Imad
         Test Priority (Low/Medium/High): High                           Test Designed date: March 29, 2026
         Module Name: System Availability and Uptime                     Test Executed by: Perla Imad
         Test Title: Verify operational availability during scheduled
         business hours
                                                                         Test Execution date: April 1, 2026

         Description: Validate that the Shutter Island system remains accessible and operational throughout scheduled business
         hours without interruption.


         Pre-conditions: • System has been deployed and started successfully
         • Business hours are defined for system operation
         • Network and server resources are active

         Dependencies: • Hosting environment
         • Network connectivity
         • Authentication service
         • Application server


                                                                                                             Status
         Step Test Steps             Test Data              Expected Result          Actual Result                       Notes
                                                                                                             (Pass/Fail)

                Access the system                                                                                       Start-of-day
                                                            System is available      System was
          1     at the start of      9:00 AM                                                                   Pass     access
                                                            and accessible.          available.
                business hours.                                                                                         successful.

                Use the system
                                                                                                                        No
                continuously         Normal operational     No interruptions or      System remained
          2                                                                                                    Pass     downtime
                during business      usage                  crashes occur.           stable.
                                                                                                                        observed.
                hours.

                Perform core
                                     CRUD and                                        Operations                         Functional
                operations while                            All operations
          3                          monitoring                                      completed                 Pass     access
                the system is                               succeed normally.
                                     operations                                      successfully.                      preserved.
                running.

                Monitor uptime
                                     Business-hours         System maintains full 100% uptime                           No failure
          4     during the                                                                                     Pass
                                     monitoring interval    uptime.               observed.                             detected.
                operating window.

                Access the system                                                                                       End-of-day
                                                            System remains           System was still
          5     near the end of      5:00 PM                                                                   Pass     access
                                                            available.               available.
                business hours.                                                                                         successful.

                Simulate access by                                                                                      No
                                                            System remains
          6     multiple users       Concurrent users                                Stability maintained.     Pass     degradation
                                                            stable and accessible.
                during operation.                                                                                       observed.


         Post-conditions: • System remains available throughout the defined operating period
         • Essential functions remain usable
         • No availability issue is detected


**Test Case:** NFR-REL-1 Positive Test Case

Project Name: Shutter Island
                                                 Test Case Template
Test Case ID: TC-NFRREL1-002                                            Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                   Test Designed date: March 29, 2026
Module Name: System Availability and Uptime                             Test Executed by: Perla Imad
Test Title: Verify system maintains controlled availability during a
                                                                        Test Execution date: April 1, 2026
temporary service interruption
Description: Test that during a short temporary interruption within
business hours, the system handles the condition in a controlled
manner and restores access without corrupting operations.


Pre-conditions: System is operating during business hours and a short service interruption is simulated.
Dependencies: Application server, hosting environment, and monitoring service are active.


                                                                                                             Status
       Step         Test Steps           Test Data           Expected Result      Actual Result                           Notes
                                                                                                           (Pass/Fail)
                    Access the system                        System should be System was
                                                                                                                          Normal access
         1          during business   11:00 AM               available before    available before             Pass
                                                                                                                          confirmed.
                    hours.                                   the interruption.   interruption.
                                                             System should
                    Introduce a short                                            Interruption was                         Condition
                                      Controlled             handle the
         2          temporary service                                            contained and                Pass        remained
                                      interruption           interruption in a
                    interruption.                                                monitored.                               controlled.
                                                             controlled manner.
                    Re-access the                            System should       System became
                                         Restored service                                                                 Service resumed
         3          system after                             resume availability accessible again             Pass
                                         window                                                                           successfully.
                    service restoration.                     safely.             after restoration.
                                                             System should       Essential
                    Verify essential
                                        Monitoring and       continue operating operations                                Negative condition
         4          operations after                                                                          Pass
                                        CRUD actions         without corrupted continued normally                         handled safely.
                    restoration.
                                                             state.              after restoration.


Post-conditions: System availability is restored after the short interruption and operational state remains consistent.


**Test Case:** NFR-REL-1 Negative Test Case

### NFR-REL-2: Backup and Recovery


      Project Name: Shutter Island

                                             Test Case Template
      Test Case ID: TC-NFRREL2-001                               Test Designed by: Perla Imad
      Test Priority (Low/Medium/High): High                      Test Designed date: March 29, 2026
      Module Name: Backup and Recovery                           Test Executed by: Perla Imad
      Test Title: Verify automatic daily database backups        Test Execution date: April 1, 2026
      Description: Validate that database backups are created automatically on a daily basis, stored correctly, and can
      be used for restoration.


      Pre-conditions: • Database contains valid system data
      • Backup scheduler is configured
      • Backup storage location is accessible
      Dependencies: • Backup scheduler
      • Database dump mechanism
      • Backup storage repository
      • Restore utility


                                                                                                 Status
      Step Test Steps            Test Data          Expected Result         Actual Result                    Notes
                                                                                                 (Pass/Fail)
            Trigger or wait                                                                                 Scheduled
                              Daily backup          Backup is created       Backup created
       1    for the scheduled                                                                      Pass     execution
                              schedule              successfully.           successfully.
            backup process.                                                                                 confirmed.
            Verify the                              Backup file exists in
                                                                                                            File stored
       2    existence of the     Backup directory   the configured          Backup file found.     Pass
                                                                                                            correctly.
            backup file.                            storage location.
                                                    Backup contains                                         Matched
            Validate backup      Backup snapshot
       3                                            correct and complete Data was correct.         Pass     current
            content.             vs. live DB
                                                    data.                                                   database.
                                                    Backup process
                                                                                                            Daily
            Simulate another     Next scheduled     repeats                 Backup repeated
       4                                                                                           Pass     automation
            daily cycle.         cycle              automatically on the    successfully.
                                                                                                            confirmed.
                                                    next day.
            Delete sample                           Live data is removed
            data from the                           to prepare           Data removed                       Controlled
       5                         Sample records                                                    Pass
            live database for                       restoration          successfully.                      test setup.
            restore testing.                        validation.
            Restore the                             Database is restored                                    Backup
                                 Created backup                             Data restored
       6    database from                           successfully from                              Pass     usable for
                                 file                                       successfully.
            the backup.                             the backup.                                             recovery.


      Post-conditions: • Backup files remain available
      • Backup automation remains active
      • Restored data confirms backup validity


**Test Case:** NFR-REL-2 Positive Test Case

Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-NFRREL2-002                                           Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                  Test Designed date: March 29, 2026
Module Name: Backup and Recovery                                       Test Executed by: Perla Imad
Test Title: Verify system handles a delayed daily backup cycle
                                                                       Test Execution date: April 1, 2026
safely
Description: Test that when the daily backup process is delayed, the
system handles the condition safely and completes backup
generation without affecting stored production data.


Pre-conditions: Database contains current system data and the backup scheduler is active.
Dependencies: Backup scheduler, backup storage location, and restore utility are configured.


                                                                                                           Status
       Step        Test Steps          Test Data           Expected Result      Actual Result                          Notes
                                                                                                         (Pass/Fail)
                   Wait for the
                                                           System should        Live system data
                   scheduled daily
                                       Daily backup        keep live data       remained                               Production state
        1          backup while                                                                             Pass
                                       schedule            unaffected during    unaffected during                      remained stable.
                   delaying the
                                                           the delay.           the delay.
                   backup job.
                                                        System should
                   Inspect backup                       complete backup Backup completed                               Backup job
        2          status after the   Backup job status creation safely     successfully after              Pass       recovered
                   delayed cycle.                       once resources are the delay.                                  normally.
                                                        available.
                                                        System should       Valid backup file
                   Verify the created                                                                                  Backup file present
        3                             Backup directory store a valid        was stored                      Pass
                   backup file.                                                                                        and readable.
                                                        backup file.        correctly.
                                                        System should
                   Restore sample                                           Sample restoration
                                      Created backup    support restoration                                            Negative condition
        4          data from the                                            completed                       Pass
                                      file              from the delayed                                               handled safely.
                   delayed backup.                                          successfully.
                                                        backup.


Post-conditions: Backup creation completes successfully after delay and stored data remains protected.


**Test Case:** NFR-REL-2 Negative Test Case

### NFR-REL-3: Disaster Recovery and Service Restoration


       Project Name: Shutter Island

                                                   Test Case Template
       Test Case ID: TC-NFRREL3-001                                    Test Designed by: Perla Imad
       Test Priority (Low/Medium/High): High                           Test Designed date: March 29, 2026
       Module Name: Disaster Recovery and Service
                                                                       Test Executed by: Perla Imad
       Restoration
       Test Title: Verify full system recovery within 4 hours of
       failure
                                                                       Test Execution date: April 1, 2026

       Description: Validate that the system can recover fully after a simulated failure and determine whether the full recovery
       time remains within the required 4-hour limit.


       Pre-conditions: • A recent backup is available
       • Recovery procedures are documented
       • System services can be stopped and restarted in a controlled environment

       Dependencies: • Backup repository
       • Database restore utility
       • Application restart scripts
       • Service monitoring


                                                                                                             Status
       Step Test Steps             Test Data              Expected Result           Actual Result                        Notes
                                                                                                             (Pass/Fail)

                                                          System enters failure
             Simulate a system     Controlled failure                               System went down                    Crash
        1                                                 state for recovery                                   Pass
             failure.              scenario                                         successfully.                       simulated.
                                                          testing.

                                                          Recovery starts
                                                                                                                        Backup
             Initiate the                                 correctly using           Recovery started
        2                          Recovery procedure                                                          Pass     selected for
             recovery process.                            available recovery        successfully.
                                                                                                                        restore.
                                                          resources.

             Restore the                                  Database content is       Data restored                       No loss
        3                          Latest backup                                                               Pass
             database.                                    restored completely.      successfully.                       detected.

             Restart application                                                                                        Core
                                   Application            Services restart and      Services restarted
        4    and related                                                                                       Pass     services
                                   services               become operational.       successfully.
             services.                                                                                                  available.

                                                          Full system recovery                                          Exceeded
             Measure the total     Start/end                                        Recovery completed
        5                                                 completes within <=                                   Fail    required
             recovery time.        timestamps                                       in ~ 4.5 hours.
                                                          4 hours.                                                      limit.

             Verify the                                   System is fully
                                   Post-recovery                                    Functionality restored              Stable after
        6    recovered system                             functional after                                     Pass
                                   validation                                       successfully.                       recovery.
             functionality.                               recovery.


       Post-conditions: • System services are restored
       • Data remains available
       • Recovery process is validated, but the recovery duration exceeded the 4-hour requirement


**Test Case:** NFR-REL-3 Positive Test Case

Project Name: Shutter Island
                                                 Test Case Template
Test Case ID: TC-NFRREL3-002                                           Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                  Test Designed date: March 29, 2026
Module Name: Disaster Recovery and Service Restoration                 Test Executed by: Perla Imad
Test Title: Verify system remains recoverable when restoration
                                                                       Test Execution date: April 1, 2026
takes longer than the target duration
Description: Test that after a simulated failure, the system remains
fully recoverable and stable even when the restoration duration
extends beyond the target recovery window.


Pre-conditions: Recent backup exists and recovery procedures are available in a controlled environment.
Dependencies: Backup repository, restore utility, and application restart scripts are configured.


                                                                                                          Status
       Step         Test Steps          Test Data            Expected Result     Actual Result                          Notes
                                                                                                        (Pass/Fail)
                    Simulate a system                        System should      System entered
                                      Controlled failure                                                                Recovery began as
         1          failure and start                        enter controlled   controlled recovery         Pass
                                      scenario                                                                          planned.
                    recovery.                                recovery mode.     mode.
                    Restore the                              System should      Database and
                                                                                                                        Core functionality
         2          database and      Latest backup          restore data and   services were               Pass
                                                                                                                        returned.
                    restart services.                        services safely.   restored safely.
                                                                                Recovery
                                                             System should
                                                                                completed in about                      Extended duration
                    Measure the        Recovery              remain recoverable
         3                                                                      4.5 hours and               Pass        handled without
                    recovery duration. timestamps            even under an
                                                                                system stability                        data loss.
                                                             extended duration.
                                                                                was preserved.
                                                             System should
                    Validate the                                                Recovered system
                                        Post-recovery        remain usable and                                          Negative condition
         4          recovered system                                            remained usable             Pass
                                        validation           consistent after                                           handled safely.
                    state.                                                      and consistent.
                                                             recovery.


Post-conditions: System is fully restored, data remains available, and the environment stays stable after an extended recovery duration.


**Test Case:** NFR-REL-3 Negative Test Case

### NFR-REL-4: Transaction Management and Data Integrity


      Project Name: Shutter Island

                                                    Test Case Template
      Test Case ID: TC-NFRREL4-001                                        Test Designed by: Perla Imad
      Test Priority (Low/Medium/High): High                               Test Designed date: March 29, 2026
      Module Name: Transaction Management and Data
                                                                          Test Executed by: Perla Imad
      Integrity
      Test Title: Verify data integrity through transaction
      management and error handling
                                                                          Test Execution date: April 1, 2026

      Description: Validate that the system preserves data integrity during normal operations, invalid input attempts, transaction
      failures, and concurrent updates.


      Pre-conditions: • Database transaction support is enabled
      • Validation rules are configured
      • Test environment allows rollback and concurrent update simulation

      Dependencies: • Database transaction engine
      • Validation layer
      • Concurrency control and rollback mechanisms


                                                                                                               Status
      Step Test Steps              Test Data                  Expected Result         Actual Result                        Notes
                                                                                                               (Pass/Fail)

                                   Valid
             Insert valid data                                Data is stored          Data stored                         No issue
       1                           session/participant                                                           Pass
             into the system.                                 correctly.              successfully.                       observed.
                                   data

                                                              Invalid data is
                                                                                                                          Validation
             Attempt to insert     Invalid or incomplete      rejected without
       2                                                                              Invalid data rejected.     Pass     worked
             invalid data.         fields                     corrupting existing
                                                                                                                          correctly.
                                                              data.

             Simulate a
                                   Forced transaction         Transaction is rolled   Rollback executed                   Integrity
       3     transaction failure                                                                                 Pass
                                   error                      back completely.        successfully.                       maintained.
             during an update.

             Perform
                                                              Data remains
             concurrent                                                               Data remained                       Handled
       4                           Concurrent requests        consistent with no                                 Pass
             updates on related                                                       consistent.                         correctly.
                                                              corruption.
             data.

             Verify database                                  No duplication,                                             No
                                                                                      Database remained
       5     consistency after     Database state check       partial updates, or                                Pass     anomalies
                                                                                      clean.
             all operations.                                  anomalies exist.                                            found.

                                                              Retrieved data                                              Matched
             Retrieve the                                                             Retrieved data was
       6                           Stored records             matches the                                        Pass     expected
             affected records.                                                        accurate.
                                                              intended valid state.                                       values.


      Post-conditions: • Data remains accurate and consistent
      • Failed transactions do not corrupt records
      • Transaction and validation controls preserve integrity


**Test Case:** NFR-REL-4 Positive Test Case

Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-NFRREL4-002                                          Test Designed by: Perla Imad
Test Priority (Low/Medium/High): High                                 Test Designed date: March 29, 2026
Module Name: Transaction Management and Data Integrity                Test Executed by: Perla Imad
Test Title: Verify system preserves data integrity during a forced
                                                                      Test Execution date: April 1, 2026
transaction interruption
Description: Test that when a transaction is interrupted during
processing, the system protects stored data by keeping the database
in a consistent state.


Pre-conditions: Transaction support is enabled and valid baseline records already exist in the database.
Dependencies: Transaction engine, validation rules, and rollback mechanism are enabled.


                                                                                                             Status
       Step         Test Steps          Test Data           Expected Result     Actual Result                            Notes
                                                                                                           (Pass/Fail)
                                                           System should
                   Start an update that
                                        Valid linked       begin the           Transaction started                       Baseline operation
        1          affects multiple                                                                           Pass
                                        records            transaction         normally.                                 confirmed.
                   related records.
                                                           normally.
                                                           System should
                   Interrupt the                                               Partial updates
                                        Forced transaction protect stored data                                           Database remained
        2          transaction before                                          were not persisted             Pass
                                        interruption       from partial                                                  protected.
                   completion.                                                 to the database.
                                                           updates.
                   Inspect the                             System should       Affected records
                                                                                                                         No corruption was
        3          affected records     Updated record set keep record values remained                        Pass
                                                                                                                         observed.
                   after interruption.                     consistent.         consistent.
                                                           System should       Retry completed
                   Retry a valid
                                        Same valid record continue normal successfully and                               Negative condition
        4          transaction after                                                                          Pass
                                        set                processing after    data remained                             handled safely.
                   the interruption.
                                                           the event.          accurate.


Post-conditions: Database consistency is preserved, interrupted transactions do not corrupt records, and normal processing remains
possible.


**Test Case:** NFR-REL-4 Negative Test Case

## IX.4 Authentication, Access Control & Live Streaming

### IX.4.1 Functional Requirements

### SR-SEC-1: Authentication & Access Control


    Project Name: Shutter Island
Test Case ID: TC-SRSEC1-001                                                  Test Designed by: Eyad Oumar
Test Priority (Low/Medium/High): High                                        Test Designed date: March 31, 2026
Module Name: Authentication & Access Control                                 Test Executed by: Eyad Oumar
Test Title: Verify secure credential validation for staff user               Test Execution date: April 1, 2026
authentication
Description: Test that the system authenticates staff users using
valid credentials before granting access.

Pre-conditions
   • Staff user account exists in the database
   • User status is Active
   • Login interface is available
Dependencies:
   • Credential validation logic is implemented
   • User records and password hashes are stored correctly

                                                             Expected Result               Actual Result                  Status        Notes
Step    Test Steps                 Test Data                                                                              (Pass/Fail)
                                                             Login page is displayed       Login page displayed
1        Navigate to login page    Staff username/email                                                                   Pass
         Provide valid                                       Username is accepted          Username accepted              Pass
2       username/email             staff1@test.com
                                   Valid password            Password is accepted          Password validated             pass

                                   Password:
3       Provide valid password     E!ad_s@nd!ng_h@11O
                                                             Staff user is authenticated   Access granted and logged to   Pass
                                                             and granted access to         the dashboard
4       Click on Login button                                permitted interface


Post-conditions:
User is validated with database and successfully login to account. The account session details are logged in database.


**Test Case:** SR-SEC-1 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSEC1-002                                              Test Designed by: Eyad Oumar
Test Priority (Low/Medium/High): High                                    Test Designed date: March 31, 2026
Module Name: Authentication & Access Control                             Test Executed by: Eyad Oumar
Test Title: Verify system rejects invalid staff credentials              Test Execution date: April 1, 2026
Description: Test that the system refuses login when invalid
credentials are entered.

Pre-conditions
   • Login interface is available
Dependencies:
   • Credential validation logic is implemented


                                                          Expected Result            Actual Result              Status        Notes
Step    Test Steps                  Test Data                                                                   (Pass/Fail)
                                                          Login page is displayed    Login page displayed
1        Navigate to login page                                                                                 Pass
        Enter invalid                                     Username submitted         Username submitted         Pass
2       username/email              invalid@test.com
3        Provide invalid password   wrong123              Password submitted         Password submitted         pass
                                                          System rejects login and   System rejects login and   Pass
4       Click on Login button                             displays error message     displays error message


Post-conditions:
No session is created


**Test Case:** SR-SEC-1 Negative Test Case

### SR-SEC-2: Role-Based Access Control (Administrator, Staff, Viewer)


    Project Name: Shutter Island
Test Case ID: TC-SRSEC2-001                                                 Test Designed by: Eyad Oumar
Test Priority (Low/Medium/High): High                                       Test Designed date: March 31, 2026
Module Name: Authentication & Access Control                                Test Executed by: Eyad Oumar
Test Title: Verify role-based access restrictions for Administrator,        Test Execution date: April 1, 2026
Staff, and Viewer
Description: Test that each user role can only access the features
permitted to that role.

Pre-conditions
   • One Administrator, one Staff user, and one Viewer account exist
   • RBAC rules are configured in the system
Dependencies:
   • Role enforcement logic is active
   • Protected routes and restricted UI elements are implemented


                                                            Expected Result                Actual Result                  Status        Notes
Step    Test Steps                 Test Data                                                                              (Pass/Fail)
                                                            Viewer login succeeds          Viewer login succeeds
1       Log in as Viewer           viewer@test.com                                                                        Pass
        Attempt to access admin                             Access is denied               Access is denied               Pass
2       dashboard                  Admin URL
3       Log in as Staff            staff@test.com           Staff login succeeds           Staff login succeeds           pass
        Attempt to access viewer                            Staff can access only staff-   Staff can access only staff-   Pass
        betting-only page and                               permitted functions            permitted functions
4       admin-only controls        Restricted routes
                                                            Administrator login            Administrator login succeeds   pass
5       Log in as Administrator    admin@test.com           succeeds
        Access admin                                        Access is granted                     Access is granted       pass
6       management features        Admin dashboard

Post-conditions:
   • Unauthorized access attempts are blocked
   • Role-based permissions are enforced consistently
   • Access-denied events may be logged for auditing


**Test Case:** SR-SEC-2 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSEC2-002                                             Test Designed by: Eyad Oumar
Test Priority (Low/Medium/High): High                                   Test Designed date: March 31, 2026
Module Name: Authentication & Access Control                            Test Executed by: Eyad Oumar
Test Title: Verify unauthorized role access is denied                   Test Execution date: April 1, 2026
Description: Test that users cannot access features or perform
actions outside their assigned role.

Pre-conditions
   • One Administrator, one Staff user, and one Viewer account exist
   • RBAC rules are configured in the system
Dependencies:
   • Role enforcement logic is active
   • Protected routes and restricted UI elements are implemented


                                                       Expected Result             Actual Result             Status        Notes
Step    Test Steps               Test Data                                                                   (Pass/Fail)
                                                       Login succeeds              Login succeeds
1       Login as Viewer          viewer@test.com                                                             Pass
2       Access admin page        Admin URL             Access denied               Access denied             Pass
        Attempt admin action                           System blocks action        System blocks action      pass
3       (e.g., create session)   N/A

Post-conditions:
   • Unauthorized access attempts are blocked
   • Role-based permissions are enforced consistently
   • Access-denied events may be logged for auditing


**Test Case:** SR-SEC-2 Negative Test Case

### SR-SEC-3: Viewer Authentication


    Project Name: Shutter Island
Test Case ID: TC-SRSEC3-001                                                 Test Designed by: Eyad Oumar

Test Priority (Low/Medium/High): High                                       Test Designed date: March 31, 2026
Module Name: Viewer Authentication                                          Test Executed by: Eyad Oumar
Test Title: Verify viewer account authentication before streaming           Test Execution date: April 1, 2026
and betting access
Description: Test that viewers must authenticate before accessing
streaming and betting features.

Pre-conditions
   • Viewer account exists and is active
   • Streaming and betting interfaces are available
Dependencies:
   • Viewer authentication module is implemented
   • Viewer session handling is functional

                                                             Expected Result            Actual Result              Status        Notes
Step    Test Steps                 Test Data                                                                       (Pass/Fail)
        Navigate to viewer login                             Login page is displayed    Login page is displayed
1       page                       N/A                                                                             Pass
        Enter valid viewer         viewer@test.com / valid   Credentials are accepted   Credentials are accepted   Pass
2       credentials                password
                                                             Viewer is authenticated    Viewer is authenticated    pass
3       Submit login request       N/A                       successfully               successfully
4       Open streaming page        N/A                       Access is allowed          Access is allowed          pass
5       Open betting page          N/A                       Access is allowed          Access is allowed          pass

Post-conditions:
   • Viewer session is created
   • Viewer can access only streaming and betting features
   • Authentication event is logged


**Test Case:** SR-SEC-3 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSEC3-002                                             Test Designed by: Eyad Oumar

Test Priority (Low/Medium/High): High                                   Test Designed date: March 31, 2026
Module Name: Viewer Authentication                                      Test Executed by: Eyad Oumar
Test Title: Verify unauthenticated viewer cannot access system          Test Execution date: April 1, 2026
Description: Test that unauthenticated users cannot access
streaming or betting features.

Pre-conditions
   • Streaming and betting interfaces are available
   • User is not logged in
Dependencies:
   • Authentication guard is active on protected routes


                                                          Expected Result             Actual Result               Status        Notes
Step    Test Steps                  Test Data                                                                     (Pass/Fail)
        Open stream page without                          Redirect to login page or   Redirect to login page or
1       login                       Stream URL            access denied error         access denied error         Pass
        Open betting page without                         Access denied               Access denied               Pass
2       login                       Betting URL

Post-conditions:
   - Unauthenticated user remains blocked from protected features


**Test Case:** SR-SEC-3 Negative Test Case

### SR-SEC-4: Paywall & Access Key Management


Project Name: Shutter Island
Test Case ID: TC-SRSEC4-001                                                 Test Designed by: Eyad Oumar

Test Priority (Low/Medium/High): High                                       Test Designed date: March 31, 2026
Module Name: Paywall & Access Key Management                                Test Executed by: Eyad Oumar
Test Title: Verify paywall authorization before issuing access key          Test Execution date: April 1, 2026
and key validation before stream entry
Description: Test that the system issues a unique access key only
after successful payment authorization and validates it before
allowing stream entry.

Pre-conditions
   • Viewer is authenticated
   • Active live stream exists for a session
   • Payment gateway integration is available
Dependencies:
   • Paywall module is functional
   • Access key generation and validation logic are implemented

                                                            Expected Result                Actual Result                  Status        Notes
Step   Test Steps                  Test Data                                                                              (Pass/Fail)
       Request access to live                               Paywall request is initiated   Paywall request is initiated
1      stream                      Session ID / Stream ID                                                                 Pass
       Complete payment                                     Payment is authorized          Payment is authorized          Pass
2      successfully                Valid payment details
3      Receive access key          Generated key            Unique access key is issued    Unique access key is issued    pass
       Enter stream using valid                             Stream access is granted       Stream access is granted       pass
4      access key                  Valid access key
       Attempt stream entry with                            Access is denied               Access is denied               pass
5      invalid key                 Invalid key

Post-conditions:
   • Valid access key is linked to viewer and stream
   • Invalid key usage is rejected
   • Payment and access events are logged


**Test Case:** SR-SEC-4 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSEC4-002                                             Test Designed by: Eyad Oumar

Test Priority (Low/Medium/High): High                                   Test Designed date: March 31, 2026
Module Name: Paywall & Access Key Management                            Test Executed by: Eyad Oumar
Test Title: Verify invalid payment or key is rejected                   Test Execution date: April 1, 2026
Description: Test that the system rejects access when payment is
not completed or an invalid access key is provided.

Pre-conditions
   • Viewer is authenticated
   • Active live stream exists
Dependencies:
   • Paywall module is functional
   • Access key generation and validation logic are implemented

                                                         Expected Result               Actual Result                 Status        Notes
Step   Test Steps                  Test Data                                                                         (Pass/Fail)
       Request stream access                             Access key is not generated   Access key is not generated
       without completing                                                                                            Pass
1      payment                     Session ID
       Attempt stream entry with                         Access is denied              Access is denied              Pass
2      invalid access key          INVALID_KEY

Post-conditions:
Unauthorized access is prevented

**Test Case:** SR-SEC-4 Negative Test Case

### SR-SEC-5: Viewer Role Permissions


Project Name: Shutter Island
Test Case ID: TC-SRSEC5-001                                                Test Designed by: Eyad Oumar

Test Priority (Low/Medium/High): Medium                                    Test Designed date: March 31, 2026
Module Name: Viewer Role Permissions                                       Test Executed by: Eyad Oumar
Test Title: Verify viewer role is restricted to viewing and betting        Test Execution date: April 1, 2026
features only
Description: Test that viewers cannot access administration,
session control, or gameplay management features.

Pre-conditions
   • Viewer account exists and is authenticated
   • Admin and staff features are available in the system
Dependencies:
   • Viewer role restrictions are configured
   • Hidden and protected routes are implemented

                                                             Expected Result          Actual Result             Status        Notes
Step   Test Steps                  Test Data                                                                    (Pass/Fail)
                                   viewer@test.comSession Viewer is logged in         Viewer is logged in
1      Log in as Viewer            ID / Stream ID                                                               Pass
2      Access live stream page     N/A                       Access is granted        Access is granted         Pass
3      Access betting page         N/A                       Access is granted        Access is granted         pass
       Attempt to access session                             Access is denied         Access is denied          pass
4      management page             Admin route
       Attempt to access                                     Access is denied         Access is denied          pass
       participant management
5      page                        Staff/Admin route


Post-conditions:
   • Viewer remains restricted to allowed functions
   • Unauthorized feature access is blocked
   • Restriction behavior is consistent across UI and routes


**Test Case:** SR-SEC-5 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSEC5-002                                                  Test Designed by: Eyad Oumar

Test Priority (Low/Medium/High): Medium                                      Test Designed date: March 31, 2026
Module Name: Viewer Role Permissions                                         Test Executed by: Eyad Oumar
Test Title: Verify viewer cannot access restricted features                  Test Execution date: April 1, 2026
Description: Test that the system prevents a viewer from
accessing features reserved for higher-privileged roles.

Pre-conditions
   • Viewer account exists and is authenticated
   • Admin and staff features are available in the system
Dependencies:
   • Viewer role restrictions are configured
   • Hidden and protected routes are implemented

                                                            Expected Result             Actual Result             Status        Notes
Step   Test Steps                Test Data                                                                        (Pass/Fail)
                                 viewer@test.comSession Login succeeds                  Login succeeds
1      Log in as Viewer          ID / Stream ID                                                                   Pass
       Attempt to access admin                              Access denied               Access denied             Pass
2      page                      Admin URL
       Attempt to perform                                   Action blocked              Action blocked            pass
       session control action
3      (e.g., pause session)     N/A


Post-conditions:
   • Unauthorized feature access is blocked


**Test Case:** SR-SEC-5 Negative Test Case

### SR-STR-1: Authorized Viewer Stream Access


Project Name: Shutter Island
Test Case ID: TC-SRSTR1-001                                                  Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                        Test Designed date: March 31, 2026
Module Name: Viewer Role Permissions                                         Test Executed by: Eyad Oumar
Test Title: Verify authorized viewers can access live-streaming              Test Execution date: April 1, 2026
interface for active sessions
Description: Test that only authorized viewers can access the live-
streaming interface for an active session.

Pre-conditions
   • Viewer is authenticated
   • Payment is authorized
   • Valid access key exists
   • Session stream is active
Dependencies:
   • Live streaming service is operational

    •    Stream-view authorization checks are enabled

                                                              Expected Result           Actual Result             Status        Notes
Step    Test Steps                    Test Data                                                                   (Pass/Fail)
        Log in as authorized                                  Viewer is authenticated   Viewer is authenticated
1       viewer                        Valid viewer account                                                        Pass
2       Enter live-stream interface   Valid access key        Interface is displayed    Interface is displayed    Pass
                                                              Live video stream loads   Live video stream loads   pass
3       Join active session stream    Active Stream ID        successfully              successfully


Post-conditions:
   • Authorized viewer is connected to live stream
   • Stream access is recorded
   • Viewer cannot alter session state


**Test Case:** SR-STR-1 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSTR1-002                                             Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                   Test Designed date: March 31, 2026
Module Name: Viewer Role Permissions                                    Test Executed by: Eyad Oumar
Test Title: Verify unauthorized stream access is denied                 Test Execution date: April 1, 2026
Description: Test that the system denies access to the live stream
for viewers who are not authorized.

Pre-conditions
   • Active session stream exists
   • User is not logged in or lacks a valid access key
Dependencies:
   • Live streaming service is operational
   • Stream-view authorization checks are enabled

                                                         Expected Result              Actual Result                Status        Notes
Step   Test Steps              Test Data                                                                           (Pass/Fail)
       Attempt to open live                              Access denied, redirect to   Access denied, redirect to
       stream without                                    login, or error message      login, or error message      Pass
1      authentication          Stream URL                displayed                    displayed


Post-conditions:
Unauthorized user cannot view the stream


**Test Case:** SR-STR-1 Negative Test Case

### SR-STR-2: Viewer Interaction Control


Project Name: Shutter Island
Test Case ID: TC-SRSTR2-001                                                 Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                       Test Designed date: March 31, 2026
Module Name: Live Streaming / Viewer Interaction Control                    Test Executed by: Eyad Oumar
Test Title: Verify viewers cannot send inputs or actions affecting          Test Execution date: April 1, 2026
gameplay or participant states
Description: Test that viewers are restricted from sending any
control input to the gameplay subsystem.

Pre-conditions
   • Viewer is authenticated and connected to an active stream
   • Active session exists
Dependencies:
   • Viewer interface is read-only with respect to gameplay
   • Backend rejects unauthorized control commands

                                                              Expected Result              Actual Result                Status        Notes
Step   Test Steps                  Test Data                                                                            (Pass/Fail)
       Log in as Viewer and open                              Stream is displayed          Stream is displayed
1      live stream                 Valid viewer credentials                                                             Pass
       Attempt to trigger          Pause/Start/Eliminate         System rejects action     System rejects action        Pass
2      gameplay action             action
       Observe                                                No participant or gameplay   No participant or gameplay   Pass
3      participant/session state   Active session             state changes occur          state changes occur


Post-conditions:
   • Viewer remains in observation-only mode
   • No gameplay commands are accepted from viewer interface
   • Unauthorized attempt may be logged


**Test Case:** SR-STR-2 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSTR2-002                                            Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                  Test Designed date: March 31, 2026
Module Name: Live Streaming / Viewer Interaction Control               Test Executed by: Eyad Oumar
Test Title: Verify invalid gameplay control attempt is rejected        Test Execution date: April 1, 2026
Description: Test that the system rejects any attempt by a viewer
to send a gameplay control command.

Pre-conditions
   • Viewer is authenticated and connected to an active stream
   • Active session exists
Dependencies:
   • Viewer interface is read-only with respect to gameplay
   • Backend rejects unauthorized control commands

                                                       Expected Result                 Actual Result                  Status        Notes
Step   Test Steps                Test Data                                                                            (Pass/Fail)
       Attempt to send a                               System rejects the action       System rejects the action
       gameplay control action                                                                                        Pass
1      (e.g., pause session)     N/A
       Verify session and                                No changes occur in the       No changes occur in the        Pass
2      participant state         N/A                    session or participant state   session or participant state


Post-conditions:
No gameplay commands are accepted from the viewer

**Test Case:** SR-STR-2 Negative Test Case

### SR-STR-3: Live Streaming Security (Encryption)


Project Name: Shutter Island
Test Case ID: TC-SRSTR3-001                                                Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                      Test Designed date: March 31, 2026
Module Name: Live Streaming Security                                       Test Executed by: Eyad Oumar
Test Title: Verify live-streaming data is encrypted to prevent             Test Execution date: April 1, 2026
unauthorized access
Description: Test that live-stream traffic is delivered using
encryption and is not accessible through insecure transmission.

Pre-conditions
   • Active stream exists
   • Authorized viewer access is available
   • Test environment supports inspection of connection security
Dependencies:
   • HTTPS/TLS is enabled
   • Encrypted streaming delivery is configured

                                                            Expected Result                Actual Result                  Status        Notes
Step   Test Steps                Test Data                                                                                (Pass/Fail)
                                                            Stream page loads              Stream page loads
1      Open live-stream page     Valid viewer account                                                                     Pass
       Inspect connection                                         Connection uses          Connection uses HTTPS/TLS      Pass
2      protocol                  Browser/network tools              HTTPS/TLS
       Attempt insecure access                                  Access is blocked or       Access is blocked or           Pass
3      method                    HTTP/non-secure endpoint   redirected to secure channel   redirected to secure channel


Post-conditions:
   • Stream is delivered through encrypted channel
   • Unauthorized insecure access is prevented
   • Secure connection remains active during stream session


**Test Case:** SR-STR-3 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSTR3-002                                                Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                      Test Designed date: March 31, 2026
Module Name: Live Streaming Security                                       Test Executed by: Eyad Oumar
Test Title: Verify live-streaming data is encrypted to prevent             Test Execution date: April 1, 2026
unauthorized access
Description: Test that live-stream traffic is delivered using
encryption and is not accessible through insecure transmission.

Pre-conditions
   • Active stream exists
   • Authorized viewer access is available
   • Test environment supports inspection of connection security
Dependencies:
   • HTTPS/TLS is enabled
   • Encrypted streaming delivery is configured

                                                             Expected Result             Actual Result               Status        Notes
Step   Test Steps                   Test Data                                                                        (Pass/Fail)
       Attempt to access the live                            Request is redirected to    Request is redirected to
1      stream via HTTP              URL of stream            HTTPS or blocked            HTTPS or blocked            Pass
       Verify the connection                                 Connection is using HTTPS   Connection is using HTTPS   Pass
2      protocol after redirection


Post-conditions:
   • Only secure connections are used for streaming


**Test Case:** SR-STR-3 Negative Test Case

### SR-STR-4: Live Streaming Audit Logging


Project Name: Shutter Island
Test Case ID: TC-SRSTR4-001                                                Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): Medium                                    Test Designed date: March 31, 2026
Module Name: Live Streaming Audit Logging                                  Test Executed by: Eyad Oumar
Test Title: Verify observer access activity is logged for                  Test Execution date: April 1, 2026
monitoring and auditing
Description: Test that each viewer access event to the live stream
is recorded with relevant audit details.

Pre-conditions
   • Viewer account exists
   • Active stream exists
   • Logging subsystem is enabled
Dependencies:
   • Audit/security logging is implemented
   • Log storage is accessible for verification

                                                          Expected Result                Actual Result                     Status        Notes
Step   Test Steps                 Test Data                                                                                (Pass/Fail)
                                  viewer@test.comURL      Login succeeds                 Login succeeds
1      Log in as Viewer           of stream                                                                                Pass
2      Access live stream         Stream ID                  Viewer enters stream        Viewer enters stream              Pass
                                                           Log entry contains viewer                                       Pass
                                                           identity, stream reference,     Log entry contains viewer
                                                                 and timestamp           identity, stream reference, and
3      Check access log records   Viewer ID / Stream ID                                             timestamp


Post-conditions:
   • Viewer access record is stored successfully
   • Audit information is available for monitoring and review


**Test Case:** SR-STR-4 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-SRSTR4-002                                                     Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): Medium                                         Test Designed date: March 31, 2026
Module Name: Live Streaming Audit Logging                                       Test Executed by: Eyad Oumar
Test Title: Verify failed access attempts are logged                            Test Execution date: April 1, 2026
Description: Test that failed attempts to access the live stream are
recorded in the audit logs.

Pre-conditions
   • Active stream exists
   • Logging subsystem is enabled
Dependencies:
   • Audit/security logging is implemented
   • Log storage is accessible for verification

                                                                 Expected Result              Actual Result              Status        Notes
Step   Test Steps                   Test Data                                                                            (Pass/Fail)
       Attempt to access live                                    Access is denied             Access is denied
       stream with invalid key or   Invalid key / unauthorized                                                           Pass
1      insufficient permissions     user
                                                                   Log entry for the failed   Log entry for the failed   Pass
       Check logs for the failed                                   attempt is present with    attempt is present with
2      attempt                      Viewer ID, Stream ID               relevant details       relevant details


Post-conditions:
Failed access attempts are recorded for security monitoring


**Test Case:** SR-STR-4 Negative Test Case

### IX.4.2 Non-functional Requirements

### NFR-SEC-1: RBAC Security


Project Name: Shutter Island
Test Case ID: TC-NFRSEC1-001                                                    Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                           Test Designed date: March 31, 2026
Module Name: RBAC Security                                                      Test Executed by: Eyad Oumar
Test Title: Verify RBAC restricts access according to                           Test Execution date: April 1, 2026
Administrator, Staff, and Viewer role
Description: Test that system-wide RBAC is consistently
enforced across all protected features.

Pre-conditions
   • Accounts exist for all three roles
   • Protected functions are deployed
Dependencies:
   • RBAC middleware is enabled
   • Role checks are applied on every restricted request

                                                                 Expected Result               Actual Result                    Status        Notes
Step   Test Steps                    Test Data                                                                                  (Pass/Fail)
       Log in as each role           Admin/Staff/Viewer          Login succeeds for valid      Login succeeds for valid users
1      separately                    accounts                    users                                                          Pass
       Attempt cross-role feature                                Only permitted features are   Only permitted features are      Pass
2      access                        Restricted pages/actions       accessible to each role    accessible to each role
       Attempt unauthorized          Admin-only or Viewer-only      System denies access           System denies access         Pass
3      operation                     action                              consistently                    consistently


Post-conditions:
   • RBAC remains enforced across modules
   • Unauthorized access attempts are blocked and may be logged


**Test Case:** NFR-SEC-1 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-NFRSEC1-002                                              Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                     Test Designed date: March 31, 2026
Module Name: RBAC Security                                                Test Executed by: Eyad Oumar
Test Title: Verify RBAC violation is blocked                              Test Execution date: April 1, 2026
Description: Test that a user with a lower-privilege role cannot
access features reserved for a higher-privilege role.

Pre-conditions
   • Accounts exist for all three roles
   • Protected functions are deployed
Dependencies:
   • RBAC middleware is enabled
   • Role checks are applied on every restricted request

                                                            Expected Result          Actual Result             Status        Notes
Step   Test Steps               Test Data                                                                      (Pass/Fail)
                                                            Login succeeds           Login succeeds
1      Log in as a Viewer       viewer@test.com                                                                Pass
       Attempt to access a                                       Access is denied    Access is denied          Pass
       feature reserved for     Admin/Staff-only route or
2      Administrator or Staff   action


Post-conditions:
RBAC violation is blocked


**Test Case:** NFR-SEC-1 Negative Test Case

### NFR-SEC-2: Transport Security


Project Name: Shutter Island
Test Case ID: TC-NFRSEC2-001                                          Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                 Test Designed date: March 31, 2026
Module Name: Transport Security                                       Test Executed by: Eyad Oumar
Test Title: Verify all data transmissions are encrypted using         Test Execution date: April 1, 2026
HTTPS
Description: Test that all client-server communications occur over
HTTPS.

Pre-conditions
   • Web application is deployed
   • Test browser/network tools are available
Dependencies:
   • HTTPS is configured at server and client entry points
   • Insecure endpoints are disabled or redirected

                                                       Expected Result             Actual Result             Status        Notes
Step   Test Steps              Test Data                                                                     (Pass/Fail)
                                                       System loads over HTTPS     System loads over HTTPS
1      Log in as a Viewer      System URL                                                                    Pass
       Attempt access over                               Request is blocked or     Request is blocked or     Pass
2      HTTP                    Non-secure URL             redirected to HTTPS      redirected to HTTPS
       Inspect form            Login / stream / bet      All requests use secure   All requests use secure   Pass
3      submissions/API calls   requests                         transport          transport


Post-conditions:
   • No sensitive operation is transmitted over unsecured protocol
   • HTTPS enforcement is confirmed


**Test Case:** NFR-SEC-2 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-NFRSEC2-002                                          Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                 Test Designed date: March 31, 2026
Module Name: Transport Security                                       Test Executed by: Eyad Oumar
Test Title: Verify HTTP access is rejected                            Test Execution date: April 1, 2026
Description: Test that attempts to access the application over
HTTP are rejected or redirected.

Pre-conditions
   • Web application is deployed
Dependencies:
   • HTTPS is configured at server and client entry points
   • Insecure endpoints are disabled or redirected

                                                        Expected Result           Actual Result             Status        Notes
Step   Test Steps              Test Data                                                                    (Pass/Fail)
                                                        Request is blocked or     Request is blocked or
       Attempt to access the                            redirected to the HTTPS   redirected to the HTTPS   Pass
1      system via HTTP         HTTP URL                 version of the site       version of the site


Post-conditions:
No communication occurs over HTTP


**Test Case:** NFR-SEC-2 Negative Test Case

### NFR-SEC-3: Viewer Authentication


Project Name: Shutter Island
Test Case ID: TC-NFRSEC3-001                                                      Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                             Test Designed date: March 31, 2026
Module Name: Data Security                                                        Test Executed by: Eyad Oumar
Test Title: Verify sensitive participant data is stored using                     Test Execution date: April 1, 2026
secure practices including encryption where applicable
Description: Test that sensitive stored data is protected according
to secure storage practices.

Pre-conditions
   • Participant records exist in the database
   • Authorized inspection access is available for testing
Dependencies:
   • Secure database storage policies are implemented
   • Sensitive fields are protected appropriately

                                                                  Expected Result               Actual Result                     Status        Notes
Step   Test Steps                  Test Data                                                                                      (Pass/Fail)
       Create or inspect                                          Record exists in database     Record exists in database
1      participant record          Participant sample data                                                                        Pass
                                                                  Sensitive data is not         Sensitive data is not exposed     Pass
                                                                  exposed insecurely in plain   insecurely in plain application
                                                                  application views and is      views and is stored securely
                                                                  stored securely where         where applicable
       Review storage of                                          applicable
2      sensitive fields            Sensitive participant fields
       Access record through       Authorized admin/staff         Access is limited to          Access is limited to permitted    Pass
3      authorized interface only   user                           permitted users               users


Post-conditions:
   • Sensitive data remains protected
   • Unauthorized viewing or raw exposure is prevented


**Test Case:** NFR-SEC-3 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-NFRSEC3-002                                              Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                     Test Designed date: March 31, 2026
Module Name: Data Security                                                Test Executed by: Eyad Oumar
Test Title: Verify unauthorized data access is prevented                  Test Execution date: April 1, 2026
Description: Test that users without proper authorization cannot
access sensitive participant data.

Pre-conditions
   • Participant records exist in the database
   • Authorized inspection access is available for testing
Dependencies:
   • Secure database storage policies are implemented
   • Access control on data is enforced


                                                         Expected Result             Actual Result             Status        Notes
Step   Test Steps                 Test Data                                                                    (Pass/Fail)
       Log in as a user without                          Login succeeds              Login succeeds
       permission to view                                                                                      Pass
       sensitive data (e.g.,
1      Viewer)                    viewer@test.com
       Attempt to access an                              Access is denied            Access is denied          Pass
       endpoint or UI component
       displaying sensitive
2      participant data           Restricted data URL


Post-conditions:
   • Unauthorized data access is prevented


**Test Case:** NFR-SEC-3 Negative Test Case

### NFR-SEC-4: Paywall Access Key Management


Project Name: Shutter Island
Test Case ID: TC-NFRSEC4-001                                                    Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                           Test Designed date: March 31, 2026
Module Name: Architecture Security Separation                                   Test Executed by: Eyad Oumar
Test Title:     Verify strict separation between gameplay                       Test Execution date: April 1, 2026
subsystem and betting subsystem
Description: Test that betting operations cannot modify or
interfere with gameplay/session execution

Pre-conditions
   • Active game session exists
   • Betting subsystem is enabled
   • Viewer can place bets
Dependencies:
   • Gameplay and betting modules are logically separated
   • No direct write path from betting to game engine state exists


                                                                Expected Result                Actual Result                   Status        Notes
Step   Test Steps                  Test Data                                                                                   (Pass/Fail)
                                                                Session becomes active         Session becomes active
1      Start active game session   Session ID                                                                                  Pass
       Place viewer bet during                                  Bet is accepted if valid       Bet is accepted if valid        Pass
2      session                     Valid bet data
                                                                Bet placement does not         Bet placement does not alter    Pass
       Verify session/gameplay     Session state, participant   alter gameplay state,          gameplay state, eliminations,
3      state after bet placement   state                        eliminations, or progression   or progression
       Attempt invalid betting-    Simulated subsystem          System blocks interference       System blocks interference    Pass
4      side control effect         misuse                       with gameplay subsystem           with gameplay subsystem


Post-conditions:
   • Betting data is stored separately from gameplay control
   • Gameplay integrity is preserved


**Test Case:** NFR-SEC-4 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-NFRSEC4-002                                            Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                   Test Designed date: March 31, 2026
Module Name: Architecture Security Separation                           Test Executed by: Eyad Oumar
Test Title:    Verify betting cannot alter gameplay                     Test Execution date: April 1, 2026
Description: Test that any attempt to use the betting subsystem to
modify gameplay is blocked.

Pre-conditions
   • Active game session exists
   • Betting subsystem is enabled
Dependencies:
   • Gameplay and betting modules are logically separated
   • No direct write path from betting to game engine state exists


                                                         Expected Result           Actual Result                    Status        Notes
Step   Test Steps                 Test Data                                                                         (Pass/Fail)
       Attempt to send a                                 System blocks the         System blocks the interference
       command from the betting                          interference attempt      attempt                          Pass
       interface to modify
1      gameplay state                 Simulated misuse


Post-conditions:
   • Gameplay integrity is preserved

**Test Case:** NFR-SEC-4 Negative Test Case

### NFR-SEC-5: Viewer Role Permissions


Project Name: Shutter Island
Test Case ID: TC-NFRSEC5-001                                                  Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): Medium                                       Test Designed date: March 31, 2026
Module Name: Security Logging & Retention                                     Test Executed by: Eyad Oumar
Test Title:    Verify security logs are recorded and retained for             Test Execution date: April 1, 2026
observer access and bet activity
Description: Test that the system records and retains logs related
to viewer access and betting actions.

Pre-conditions
   • Viewer account exists
   • Active stream exists
   • Betting feature is enabled
   • Logging storage is available
Dependencies:
   • Audit/security log retention is configured
   • Viewer activity and bet activity are loggable events


                                                               Expected Result                Actual Result                     Status        Notes
Step   Test Steps                    Test Data                                                                                  (Pass/Fail)
       Viewer accesses live                                    Access event is logged         Access event is logged
1      stream                          Viewer ID / Stream ID                                                                    Pass
                                                               Bet event is logged            Bet event is logged               Pass
2      Viewer places bet                     Bet data
                                                               Logs contain timestamps        Logs contain timestamps and       Pass
                                                               and relevant actor/activity    relevant actor/activity details
3      Retrieve logs after actions       Log query criteria    details
       Verify logs remain                                      Logs are retained for review   Logs are retained for review      Pass
       available after normal
4      session end                       Same log criteria


**Test Case:** NFR-SEC-5 Positive Test Case

Project Name: Shutter Island
Test Case ID: TC-NFRSEC5-002                                                Test Designed by: Eyad Oumar


Test Priority (Low/Medium/High): High                                       Test Designed date: March 31, 2026
Module Name: Security Logging & Retention                                   Test Executed by: Eyad Oumar
Test Title:    Verify invalid activity is still handled and logged          Test Execution date: April 1, 2026
Description: Test that the system logs attempts to perform invalid
or unauthorized actions.

Pre-conditions
   • Viewer account exists
   • Active stream exists
   • Logging storage is available
Dependencies:
   • Audit/security log retention is configured
   • Viewer activity and bet activity are loggable events


                                                            Expected Result                Actual Result                   Status        Notes
Step   Test Steps                    Test Data                                                                             (Pass/Fail)
       Perform an invalid action                            Action is rejected by the      Action is rejected by the
       (e.g., attempt to access a                           system                         system                          Pass
       restricted resource, use an
1      invalid key)                              N/A
                                                            The invalid attempt is         The invalid attempt is logged   Pass
                                                            logged with relevant details   with relevant details (e.g.,
       Check the security logs                              (e.g., user, timestamp,        user, timestamp, action)
2      for the event                      User ID, Action   action)


**Test Case:** NFR-SEC-5 Negative Test Case

## IX.5 Payment, Betting & Scalability

### IX.5.1 Functional Requirements

### SR-BET-1: Authorized Viewer Bet Placement


Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRBET1-001                                        Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                              Test Designed date: 2025
Module Name: Payment & Betting Module                              Test Executed by: Mamdouh Dabjan
Test Title: Authorized viewer places a bet on a                    Test Execution date: 2025
predefined session outcome
Description: Verify that an authenticated viewer
with a valid access key can successfully place a bet
on a predefined outcome of an active session.
Pre-conditions: Viewer is authenticated and holds a valid, non-expired ViewerAccessKey • A GameSession with Status='Active'
exists • The session has at least one predefined bet outcome configured • The Betting Management Module is operational
Dependencies: SR-SEC-3 (Viewer authentication) • SR-SEC-4 (Access key validation) • SR-STR-1 (Live stream access) • SR-BET-7
(Payment gateway)
                                                                                                          Status
Step Test Steps                  Test Data               Expected Result         Actual Result            (Pass/Fail) Notes
        Log in to Viewer                                 Authenticated;          Authenticated;
1       Portal                   viewer01 / valid_pass dashboard shown           dashboard shown          Pass
        Open betting
        interface for active                             Available outcomes      Available outcomes
2       session                  SES-101 (Active)        displayed               displayed                Pass
        Select outcome and       EliminationOrder,       Bet type and amount     Bet type and amount
3       enter bet amount         PlayerA_First, 50       validated               validated                Pass
                                                         Bet record created      Bet record created
        Submit bet and                                   (Pending);              (Pending); confirmation
4       complete payment         TXN-2001 authorized confirmation shown          shown                    Pass
Post-conditions: A Bet record exists in the database linked to the correct GameSession and LiveStream • The viewer's bet activity is
logged in the AuditLog


**Test Case:** SR-BET-1 Positive Test Case

Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-SRBET1-002                                      Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                            Test Designed date: 2025
Module Name: Payment & Betting Module                            Test Executed by: Mamdouh Dabjan
Test Title: Unauthenticated user attempts to place a             Test Execution date: 2025
bet — access denied
Description: Verify that a user without a valid
authenticated session is denied access to the bet
placement interface.
Pre-conditions: No active viewer session token exists • A GameSession with Status='Active' exists • The system is operational
Dependencies: SR-SEC-3 (Viewer authentication) • SR-SEC-4 (Access key validation)
                                                                                                            Status
Step Test Steps               Test Data                Expected Result          Actual Result               (Pass/Fail) Notes
       Navigate to
       /bet/place without
1      login                  No session token         No valid token found     No valid token found        Pass
       Authorization layer                             Request rejected by      Request rejected by
2      evaluates request      Auth header: absent      auth layer               auth layer                  Pass
       System returns error                            HTTP 401 returned;       HTTP 401 returned; no
3      response               N/A                      no bet created           bet created                 Pass
Post-conditions: No Bet record is persisted • The access denial event is recorded in the AuditLog with a timestamp


**Test Case:** SR-BET-1 Negative Test Case

### SR-BET-2: Bet Validation and Payment Confirmation


Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-SRBET2-001                                        Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                              Test Designed date: 2025
Module Name: Payment & Betting Module                              Test Executed by: Mamdouh Dabjan
Test Title: Bet validation succeeds with valid rules               Test Execution date: 2025
and confirmed payment
Description: Verify that a bet is accepted only when
it satisfies all configured validation rules and
payment is confirmed by the integrated payment
gateway.
Pre-conditions: Viewer is authenticated with a valid access key • Session Status='Active' • Payment gateway is connected and
operational • Bet rules are configured (valid bet types, amount limits)
Dependencies: SR-BET-1 (Bet placement) • SR-BET-7 (Payment gateway integration) • SR-SEC-4 (Paywall authorization)
                                                                                                              Status
Step Test Steps                  Test Data                Expected Result        Actual Result                (Pass/Fail) Notes
        Select valid bet type SurvivalDuration,
1       for session              SES-102                  Bet type accepted      Bet type accepted            Pass
        Enter bet amount         Amount: 100              Amount validated       Amount validated
2       within limits            (Min:10, Max:500)        within bounds          within bounds                Pass
        Submit payment via                                Payment confirmed;     Payment confirmed; bet
3       gateway                  PT-5501, APPROVED        bet finalized          finalized                    Pass
                                                          Bet created
        System stores bet                                 (Pending); rules       Bet created (Pending);
4       record                   N/A                      satisfied              rules satisfied              Pass
Post-conditions: Bet record exists with all required fields • Payment confirmation is linked to the bet via a unique transaction
identifier • Audit log entry created


**Test Case:** SR-BET-2 Positive Test Case

Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-SRBET2-002                                       Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                             Test Designed date: 2025
Module Name: Payment & Betting Module                             Test Executed by: Mamdouh Dabjan
Test Title: Bet rejected when payment is not                      Test Execution date: 2025
confirmed by the payment gateway
Description: Verify that a bet is not accepted if the
payment gateway declines or does not confirm the
transaction.
Pre-conditions: Viewer is authenticated with a valid access key • Session Status='Active' • Payment gateway is connected but
configured to return a DECLINED response for this test
Dependencies: SR-BET-1 (Bet placement) • SR-BET-7 (Payment gateway integration)
                                                                                                            Status
Step Test Steps               Test Data                 Expected Result          Actual Result              (Pass/Fail) Notes
       Select bet type and
1      enter amount           EliminationOrder, 75      Bet params validated     Bet params validated       Pass
       Submit payment;                                  Payment failure          Payment failure
2      gateway declines       PT-5502, DECLINED         received                 received                   Pass
       System evaluates                                 Bet rejected; no         Bet rejected; no record
3      bet finalization       N/A                       record created           created                    Pass
                                                        Payment failure
       Error returned to                                shown; no bet            Payment failure shown;
4      viewer                 N/A                       registered               no bet registered          Pass
Post-conditions: No pending bet exists for this transaction • The declined payment event is recorded in the audit log


**Test Case:** SR-BET-2 Negative Test Case

### SR-BET-3: Bet Detail Storage


Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRBET3-001                                             Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                                 Test Designed date: 2025
Module Name: Payment & Betting Module                                   Test Executed by: Mamdouh Dabjan
Test Title: All required bet details are stored correctly               Test Execution date: 2025
after a successful bet placement
Description: Verify that after a bet is successfully
placed, the system stores all mandatory fields: observer
identity, selected outcome, timestamp, and bet amount.
Pre-conditions: Viewer is authenticated • Session is Active • Payment is confirmed • A Bet record is about to be created
Dependencies: SR-BET-1 (Bet placement) • SR-BET-2 (Bet validation)
                                                                                                             Status
Step Test Steps               Test Data                      Expected Result       Actual Result             (Pass/Fail) Notes
       Complete valid bet viewer02, SurvivalDuration, Bet accepted and             Bet accepted and
1      placement              Player3, 200, SES-103          stored                stored                    Pass
       Query Bet table for SELECT * FROM Bet WHERE Record returned                 Record returned with
2      new record             ViewerIdentifier='viewer02' with all fields          all fields                Pass
                              BetID, SessionID,
       Verify all             ViewerIdentifier, BetType,
       mandatory fields       Amount, Outcome, Status,       All fields match;     All fields match;
3      present                CreatedAt                      timestamp accurate timestamp accurate           Pass
Post-conditions: The stored bet record is complete and accurately reflects the submitted data • The record is traceable to both the
viewer and the active session


**Test Case:** SR-BET-3 Positive Test Case

Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-SRBET3-002                                       Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                           Test Designed date: 2025
Module Name: Payment & Betting Module                             Test Executed by: Mamdouh Dabjan
Test Title: Bet with missing mandatory field is                   Test Execution date: 2025
rejected and not stored
Description: Verify that if a mandatory bet field
(e.g., ViewerIdentifier or BetAmount) is absent, the
system rejects the bet and stores no partial record.
Pre-conditions: Viewer is authenticated • Session is Active • Payment gateway is connected • A bet request is submitted with a
missing mandatory field
Dependencies: SR-BET-1 (Bet placement) • SR-BET-2 (Bet validation)
                                                                                                           Status
Step Test Steps               Test Data                 Expected Result          Actual Result             (Pass/Fail) Notes
                              viewer03,
       Submit bet without     EliminationOrder,         Missing BetAmount        Missing BetAmount
1      BetAmount              Amount: missing           detected                 detected                  Pass
                                                        Validation fails;        Validation fails;
       System evaluates                                 rejected before DB       rejected before DB
2      request validity       N/A                       write                    write                     Pass
                                                        HTTP 400; missing
       Error returned to                                field identified; no     HTTP 400; missing field
3      viewer                 N/A                       record                   identified; no record     Pass
Post-conditions: The Bet table is unchanged • The failed submission is noted in the error log


**Test Case:** SR-BET-3 Negative Test Case

### SR-BET-4: Automatic Bet Evaluation on Session Completion


Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRBET4-001                                         Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                               Test Designed date: 2025
Module Name: Payment & Betting Module                               Test Executed by: Mamdouh Dabjan
Test Title: Bets automatically evaluated and marked                 Test Execution date: 2025
Won or Lost when session status transitions to
Finished
Description: Verify that when a GameSession
transitions to Status='Finished', all associated
Pending bets are automatically evaluated against the
actual session outcome, and each bet is updated to
Won or Lost.
Pre-conditions: A GameSession (SES-105) with Status='Active' has two Pending bets: one with a correct prediction, one with an
incorrect prediction • Exactly one SessionPlayer remains with IsAlive=TRUE
Dependencies: SR-GAME-5 (Session completion logic) • SR-BET-3 (Bet storage) • SR-BET-2 (Bet validation)
                                                                                                               Status
Step Test Steps                 Test Data               Expected Result            Actual Result               (Pass/Fail) Notes
       One player remains
       alive; session           SES-105, survivor: P- Status='Finished';           Status='Finished';
1      finishes                 10                      FinalRank=1 for P-10       FinalRank=1 for P-10        Pass
       Bet settlement
       triggered for SES-       Outcome: P-10           Settlement invoked         Settlement invoked for
2      105                      survived                for all Pending bets       all Pending bets            Pass
       Correct prediction                               B-201 Status='Won';        B-201 Status='Won';
3      evaluated                B-201, P10_survives     SettledAt set              SettledAt set               Pass
       Incorrect prediction                             B-202 Status='Lost';       B-202 Status='Lost';
4      evaluated                B-202, P11_survives     SettledAt set              SettledAt set               Pass
Post-conditions: All bets for the finished session are settled • Audit log records the settlement event • Bet outcome report for SES-
105 can now be generated


**Test Case:** SR-BET-4 Positive Test Case

Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-SRBET4-002                                       Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                             Test Designed date: 2025
Module Name: Payment & Betting Module                             Test Executed by: Mamdouh Dabjan
Test Title: Bets are not evaluated as Won/Lost                    Test Execution date: 2025
when session is cancelled before completion
Description: Verify that Pending bets are not
evaluated to Won or Lost when the session is
cancelled. Instead, they should be cancelled (per SR-
BET-8) — not settled.
Pre-conditions: A GameSession (SES-106) with Status='Active' has one Pending bet • An administrator cancels the session before
any winner is determined
Dependencies: SR-BET-8 (Refund on cancellation) • SR-GAME-5 (Session completion logic)
                                                                                                           Status
Step Test Steps             Test Data               Expected Result            Actual Result               (Pass/Fail) Notes
       Admin cancels                                Status updated to          Status updated to
1      session via override SES-106, Cancel         'Cancelled'                'Cancelled'                 Pass
                                                    Settlement not
       Check if settlement                          invoked (Cancelled !=      Settlement not invoked
2      should trigger       N/A                     Finished)                  (Cancelled != Finished)     Pass
       Refund logic                                 B-203 set to
       invoked for Pending                          Cancelled; refund          B-203 set to Cancelled;
3      bets                 B-203, Pending          initiated                  refund initiated            Pass
                            SELECT Status
       Verify bet not       FROM Bet WHERE          Status='Cancelled', not Status='Cancelled', not
4      marked Won/Lost      BetID='B-203'           Won or Lost                Won or Lost                 Pass
Post-conditions: No Won/Lost records exist for cancelled session SES-106 • All related bets are Cancelled with refunds processed


**Test Case:** SR-BET-4 Negative Test Case

### SR-BET-5: Bet Outcome Reports


Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-SRBET5-001                                       Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                           Test Designed date: 2025
Module Name: Reporting & Analytics Module                         Test Executed by: Mamdouh Dabjan
Test Title: Bet outcome report generated for a                    Test Execution date: 2025
completed session
Description: Verify that an administrator can
request and receive a complete bet outcome report
for a finished session, summarizing all bets,
outcomes, and payout information.
Pre-conditions: A GameSession (SES-107) with Status='Finished' has settled bets (Won and Lost) • Administrator is authenticated
with the Admin role
Dependencies: SR-BET-4 (Bet settlement) • SR-DAT-2 (Reporting module) • SR-SEC-2 (RBAC)
                                                                                                            Status
Step Test Steps               Test Data               Expected Result           Actual Result               (Pass/Fail) Notes
       Navigate to                                    Reporting interface
       Reporting &                                    with finished sessions    Reporting interface with
1      Analytics              Admin role, SES-107 shown                         finished sessions shown     Pass
       Request Bet
       Outcome Report for     BetOutcome, SES-        Bet table queried for     Bet table queried for
2      SES-107                107                     SES-107 records           SES-107 records             Pass
                                                      Report: totals,           Report: totals,
       System compiles                                Won/Lost/Cancelled,       Won/Lost/Cancelled,
3      report                 N/A                     payouts                   payouts                     Pass
       Report displayed                               Report rendered; all      Report rendered; all
4      and downloadable       N/A                     bets included             bets included               Pass
Post-conditions: Report data is consistent with the Bet table contents • No new records are created by the report generation process


**Test Case:** SR-BET-5 Positive Test Case

Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRBET5-002                                         Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                             Test Designed date: 2025
Module Name: Reporting & Analytics Module                           Test Executed by: Mamdouh Dabjan
Test Title: Non-admin user denied access to bet                     Test Execution date: 2025
outcome reports
Description: Verify that a Viewer or Staff role user
cannot access administrative bet outcome reports.
Pre-conditions: A user is authenticated with the 'Viewer' role • Session SES-108 is Finished with settled bets
Dependencies: SR-SEC-2 (RBAC enforcement) • SR-BET-5 (Bet outcome reporting)
                                                                                                             Status
Step Test Steps                Test Data               Expected Result           Actual Result               (Pass/Fail)   Notes
       Viewer accesses         /admin/reports/bet-
       admin report            outcome/SES-108,        Request intercepted       Request intercepted by
1      endpoint                Viewer role             by RBAC layer             RBAC layer                  Pass
       System checks role      Required: Admin,        Access denied by
2      permissions             Actual: Viewer          RBAC                      Access denied by RBAC       Pass
       Authorization error                             HTTP 403; no report       HTTP 403; no report
3      returned                N/A                     data shown                data shown                  Pass
Post-conditions: No report data is exposed to the Viewer • The access denial is recorded in the AuditLog


**Test Case:** SR-BET-5 Negative Test Case

### SR-BET-6: Observer Access and Bet Activity Audit Logging


Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRBET6-001                                         Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                             Test Designed date: 2025
Module Name: Payment & Betting Module                               Test Executed by: Mamdouh Dabjan
Test Title: Observer access and bet activity are                    Test Execution date: 2025
logged for auditing
Description: Verify that all viewer access events and
bet placement actions are recorded in the AuditLog
with accurate timestamps and actor identifiers.
Pre-conditions: Viewer is authenticated with a valid access key • Session is Active • Viewer accesses the live stream and places a bet
Dependencies: SR-BET-1 (Bet placement) • SR-STR-4 (Observer access logging) • SR-MON-2 (Audit logging)
                                                                                                             Status
Step Test Steps               Test Data                Expected Result            Actual Result              (Pass/Fail) Notes
       Access live stream                              Access event logged        Access event logged
1      with valid key         viewer04, AK-7701        with timestamp             with timestamp             Pass
       Place bet on active                             Bet placement logged Bet placement logged in
2      session                SurvivalDuration, 150 in AuditLog                   AuditLog                   Pass
                              SELECT * FROM            Two entries: access +      Two entries: access +
       Query AuditLog for     AuditLog WHERE           bet; timestamps            bet; timestamps
3      viewer04               ActorID='viewer04'       accurate                   accurate                   Pass
Post-conditions: Audit records are immutable and permanently stored • All access and bet activity for the session is traceable


**Test Case:** SR-BET-6 Positive Test Case

Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-SRBET6-002                                           Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                               Test Designed date: 2025
Module Name: Payment & Betting Module                                 Test Executed by: Mamdouh Dabjan
Test Title: Failed bet placement due to invalid data is               Test Execution date: 2025
logged as an error event
Description: Verify that even when a bet placement
fails (e.g., invalid data), the failed attempt is recorded
in the system error/audit log for traceability.
Pre-conditions: Viewer is authenticated • Session is Active • Viewer submits a bet with an invalid BetType not in the allowed list
Dependencies: SR-BET-2 (Bet validation) • SR-BET-6 (Audit logging for bets)
                                                                                                               Status
Step Test Steps              Test Data                     Expected Result         Actual Result               (Pass/Fail) Notes
       Submit bet with                                     Bet rejected for        Bet rejected for
1      invalid BetType       INVALID_TYPE, 50              invalid type            invalid type                Pass
       System logs failed                                  Failed attempt          Failed attempt
2      attempt               N/A                           recorded in audit log recorded in audit log         Pass
                             SELECT * FROM AuditLog
       Admin reviews         WHERE                         Failed attempt entry Failed attempt entry
3      audit log             ActionType='BetRejected' found with details           found with details          Pass
Post-conditions: The failed attempt is traceable in the audit log • No Bet record was created in the Bet table


**Test Case:** SR-BET-6 Negative Test Case

### SR-BET-7: Betting Payment Gateway Processing


Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-SRBET7-001                                     Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                           Test Designed date: 2025
Module Name: Payment & Betting Module                           Test Executed by: Mamdouh Dabjan
Test Title: Betting payment successfully confirmed              Test Execution date: 2025
through the integrated payment gateway
Description: Verify that the system correctly
processes a betting payment confirmation received
from the integrated payment gateway and finalizes
the bet.
Pre-conditions: Viewer is authenticated • Session is Active • Payment gateway is connected and returns an APPROVED response • A
valid bet has been submitted
Dependencies: SR-BET-2 (Bet validation) • SR-SES-4 (Payment gateway integration)
                                                                                                          Status
Step Test Steps               Test Data                Expected Result         Actual Result              (Pass/Fail) Notes
        Submit bet; redirect                           Payment gateway         Payment gateway
1       to gateway            Amount: 80, SES-109 shown                        shown                      Pass
        Complete payment;     TXN-3001,                Confirmation callback Confirmation callback
2       gateway approves      APPROVED                 received                received                   Pass
                                                       ID unique;
        Verify transaction ID TXN-3001 (first          idempotency check       ID unique; idempotency
3       uniqueness            occurrence)              passes                  check passes               Pass
                                                       Bet created
        Finalize and store                             (Pending), linked to    Bet created (Pending),
4       bet record            N/A                      TXN-3001                linked to TXN-3001         Pass
Post-conditions: Bet record exists with correct payment linkage • TransactionID TXN-3001 is marked as processed to prevent re-
use


**Test Case:** SR-BET-7 Positive Test Case

Project Name: Shutter Island
                                             Test Case Template
Test Case ID: TC-SRBET7-002                                     Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                           Test Designed date: 2025
Module Name: Payment & Betting Module                           Test Executed by: Mamdouh Dabjan
Test Title: Duplicate payment gateway callback is               Test Execution date: 2025
rejected (idempotency enforcement)
Description: Verify that if the payment gateway
sends the same confirmation callback twice (e.g., due
to a network retry), the system processes it only once
and does not create duplicate bet records.
Pre-conditions: A betting payment with TransactionID TXN-3002 has already been processed and a Bet record exists • The payment
gateway re-sends the same callback
Dependencies: SR-BET-7 (Payment gateway integration) • SR-BET-2 (Bet validation)
                                                                                                           Status
Step Test Steps               Test Data                 Expected Result        Actual Result               (Pass/Fail) Notes
       Gateway re-sends
       callback for TXN-      TXN-3002 (2nd time), Duplicate callback          Duplicate callback
1      3002                   APPROVED                  received               received                    Pass
                              SELECT * FROM Bet
                              WHERE
       Check if TXN-3002      TransactionID='TXN-
2      already processed      3002'                     Existing record found Existing record found        Pass
                                                        No new record;         No new record;
       Idempotency logic                                duplicate              duplicate
3      discards duplicate     N/A                       ignored/logged         ignored/logged              Pass
                              SELECT COUNT(*)
       Confirm only one       WHERE
       record for TXN-        TransactionID='TXN-
4      3002                   3002'                     Count=1; no duplicate Count=1; no duplicate        Pass
Post-conditions: Bet table contains exactly one record for TXN-3002 • Duplicate callback attempt is logged


**Test Case:** SR-BET-7 Negative Test Case (Duplicate Callback / Idempotency)

### SR-BET-8: Automatic Cancellation and Refund of Pending Bets


Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-SRBET8-001                                       Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                             Test Designed date: 2025
Module Name: Payment & Betting Module                             Test Executed by: Mamdouh Dabjan
Test Title: All Pending bets are automatically                    Test Execution date: 2025
cancelled and refunded when session is terminated
Description: Verify that when a GameSession is
terminated (Status set to 'Cancelled') before
reaching a settleable outcome, all associated
Pending bets are automatically set to 'Cancelled' and
refunds are initiated through the payment gateway.
Pre-conditions: Session SES-110 has Status='Active' with three Pending bets • Administrator terminates the session via emergency
override • Payment gateway is connected
Dependencies: SR-BET-2 (Bet validation) • SR-BET-7 (Payment gateway integration) • Database Rule 8 (automatic refund on
cancellation)
                                                                                                           Status
Step Test Steps                Test Data               Expected Result           Actual Result             (Pass/Fail) Notes
        Admin terminates
        SES-110 via                                    Status updated to         Status updated to
1       override               SES-110, Terminate      'Cancelled'               'Cancelled'               Pass
        Refund process                                 All Pending bets for      All Pending bets for
2       triggered              N/A                     SES-110 identified        SES-110 identified        Pass
        Pending bets set to                            All three Cancelled;      All three Cancelled;
3       Cancelled              B-301, B-302, B-303     SettledAt set             SettledAt set             Pass
                                                       Refunds processed;
        Refund requests        TXN-4001, TXN-          confirmations             Refunds processed;
4       sent to gateway        4002, TXN-4003          received                  confirmations received    Pass
Post-conditions: Bet table shows all three bets as 'Cancelled' with SettledAt timestamps • Refund confirmations are stored • Audit
log records the termination and refund events


**Test Case:** SR-BET-8 Positive Test Case

Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-SRBET8-002                                      Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                            Test Designed date: 2025
Module Name: Payment & Betting Module                            Test Executed by: Mamdouh Dabjan
Test Title: Pending bets are NOT refunded when                   Test Execution date: 2025
session completes normally
Description: Verify that when a session finishes
normally (Status='Finished'), Pending bets are
evaluated (Won/Lost) rather than cancelled and
refunded.
Pre-conditions: Session SES-111 has Status='Active' with two Pending bets • Session completes normally with one surviving player
(SR-GAME-5 trigger)
Dependencies: SR-BET-4 (Bet evaluation) • SR-GAME-5 (Session completion)
                                                                                                           Status
Step Test Steps                Test Data             Expected Result           Actual Result               (Pass/Fail) Notes
       One player remains;
1      session finishes        SES-111               Status='Finished'         Status='Finished'           Pass
       Check settlement vs                           Settlement invoked,       Settlement invoked, not
2      refund logic            Status: Finished      not refund                refund                      Pass
       Pending bets                                  Marked Won or Lost        Marked Won or Lost per
3      evaluated               B-304, B-305          per prediction            prediction                  Pass
       Verify no refunds       Check gateway for     No refund requests
4      issued                  SES-111 refunds       sent                      No refund requests sent Pass
Post-conditions: All bets for SES-111 have Status=Won or Lost • No cancellation or refund records exist for SES-111 bets


**Test Case:** SR-BET-8 Negative Test Case

### IX.5.2 Non-Functional Requirements

### NFR-SCA-1: Horizontal and Vertical Scaling


Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-NFRSCA1-001                                       Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                              Test Designed date: 2025
Module Name: System Infrastructure                                 Test Executed by: Mamdouh Dabjan
Test Title: System maintains performance under                     Test Execution date: 2025
high load via horizontal scaling
Description: Verify that the system supports
horizontal and vertical scaling to accommodate
increased participant and session demand without
performance degradation.
Pre-conditions: System is deployed in a scalable infrastructure • Load-testing tools (e.g., Apache JMeter) are configured • Baseline
response time under normal load is under 3 seconds (NFR-PER-1)
Dependencies: NFR-PER-1 (Response time requirement) • NFR-PER-2 (Concurrent user threshold) • NFR-FRW-3 (Framework
scalability)
                                                                                                             Status
Step Test Steps               Test Data                Expected Result            Actual Result              (Pass/Fail) Notes
        Simulate 100          100 users, mixed         All responses < 3s; no All responses < 3s; no
1       concurrent users      queries + bets           errors                     errors                     Pass
        Scale to 500 users
2       (threshold)           500 users (JMeter)       System auto-scales         System auto-scales         Pass
        Scale to 800 users                             Requests handled; no Requests handled; no
3       (above threshold)     800 users                functional loss            functional loss            Pass
                              CPU, memory,
        Monitor server        response time, error     Resources scale;           Resources scale; error
4       metrics               rate                     error rate < 1%            rate < 1%                  Pass
Post-conditions: System returns to baseline state after load test • Scale-out events are logged • No data corruption occurred during
scaling


**Test Case:** NFR-SCA-1 Positive Test Case

Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-NFRSCA1-002                                     Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                            Test Designed date: 2025
Module Name: System Infrastructure                               Test Executed by: Mamdouh Dabjan
Test Title: System without scaling configured                    Test Execution date: 2025
degrades under heavy concurrent load
Description: Verify that a system with no scaling
configured exhibits performance degradation when
subjected to load beyond its single-server capacity,
confirming that scaling is required.
Pre-conditions: System is deployed on a single fixed-capacity server with no auto-scaling • Load-testing tools are configured
Dependencies: NFR-PER-1 (Response time requirement) • NFR-PER-2 (Concurrent user threshold)
                                                                                                            Status
Step Test Steps               Test Data                Expected Result           Actual Result              (Pass/Fail) Notes
       Simulate 600 users                              CPU/RAM near              CPU/RAM near
1      on single server       600 users (JMeter)       maximum                   maximum                    Pass
                                                       Response > 3s; error
       Measure response                                rate exceeds              Response > 3s; error
2      times and errors       N/A                      threshold                 rate exceeds threshold     Pass
       Attempt session
       action under peak      Create session at        Delayed or timeout;       Delayed or timeout;
3      load                   peak                     system degraded           system degraded            Pass
Post-conditions: Test confirms single-server limitations • Infrastructure team is alerted to configure proper scaling before
production


**Test Case:** NFR-SCA-1 Negative Test Case

### NFR-SCA-2: Database Expandability Without Structural Redesign


Project Name: Shutter Island
                                             Test Case Template
Test Case ID: TC-NFRSCA2-001                                     Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                          Test Designed date: 2025
Module Name: Data Layer / MySQL Database                         Test Executed by: Mamdouh Dabjan
Test Title: New table can be added to the database               Test Execution date: 2025
schema without structural redesign
Description: Verify that the relational database
schema supports the addition of new tables and
fields to accommodate future expansion without
requiring changes to existing tables.
Pre-conditions: MySQL database is operational with the current schema • A DBA or developer has defined a new supplementary
table (e.g., PlayerAchievements) that references existing tables
Dependencies: NFR-FRW-1 (MySQL) • NFR-FRW-2 (Relational schema)
                                                                                                          Status
Step Test Steps                Test Data                 Expected Result        Actual Result             (Pass/Fail) Notes
                               CREATE TABLE
                               PlayerAchievements
        Define new table       (PK, PlayerID FK,         DDL valid; references DDL valid; references
1       with FK references     SessionID FK)             correct                correct                   Pass
                                                         Table created;
        Execute CREATE                                   existing tables        Table created; existing
2       TABLE                  N/A                       unchanged              tables unchanged          Pass
        Verify existing        DESCRIBE Player;
        structures             DESCRIBE                  No columns added or No columns added or
3       unchanged              GameSession               modified               modified                  Pass
                               Valid PlayerID and        Record inserted; FK    Record inserted; FK
4       Insert test record     SessionID                 constraints satisfied  constraints satisfied     Pass
Post-conditions: Database schema is extended with the new table • All existing queries and operations continue to function
correctly


**Test Case:** NFR-SCA-2 Positive Test Case

Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-NFRSCA2-002                                      Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                           Test Designed date: 2025
Module Name: Data Layer / MySQL Database                          Test Executed by: Mamdouh Dabjan
Test Title: Attempt to add a column that violates                 Test Execution date: 2025
normalization or FK integrity is rejected
Description: Verify that the database enforces
referential integrity and normalization constraints,
rejecting schema changes that would introduce data
anomalies.
Pre-conditions: MySQL database is operational • A developer attempts to add a column with a default FK value that references a
non-existent record
Dependencies: NFR-FRW-2 (Relational schema integrity)
                                                                                                          Status
Step Test Steps              Test Data               Expected Result          Actual Result               (Pass/Fail) Notes
                             ALTER TABLE Bet
                             ADD ApprovedBy          FK evaluated;            FK evaluated;
       Add column with       REFERENCES              ManagerID 9999 not       ManagerID 9999 not
1      invalid FK default    Manager(9999)           found                    found                       Pass
       DB enforces FK                                ALTER fails; FK          ALTER fails; FK
2      during ALTER          N/A                     violation error          violation error             Pass
       Verify Bet table                              No column added;         No column added;
3      unchanged             DESCRIBE Bet            schema intact            schema intact               Pass
Post-conditions: Database schema unchanged • Error is logged • Developer is alerted to provide a valid FK reference


**Test Case:** NFR-SCA-2 Negative Test Case

### NFR-COM-1: Multi-Device Browser Accessibility


Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-NFRCOM1-001                                     Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                          Test Designed date: 2025
Module Name: Client Layer / Viewer Portal                        Test Executed by: Mamdouh Dabjan
Test Title: System is accessible and fully functional            Test Execution date: 2025
on a mobile device browser
Description: Verify that the system's Viewer Portal
renders correctly and all core functions are usable on
a mobile device using a modern browser.
Pre-conditions: System is deployed and accessible • A mobile device with a modern browser (Chrome for Android/iOS) is available
• Viewer account exists
Dependencies: NFR-COM-2 (Mobile compatibility) • SR-STR-1 (Live stream access) • SR-BET-1 (Bet placement)
                                                                                                           Status
Step Test Steps               Test Data                Expected Result          Actual Result              (Pass/Fail) Notes
                                                       Portal loads;
       Open portal on         iPhone 14, Safari 17,    responsive layout        Portal loads; responsive
1      mobile device          390x844px                applied                  layout applied             Pass
                                                       Login succeeds;          Login succeeds;
       Authenticate as        viewer05, valid          dashboard shown on       dashboard shown on
2      viewer                 password                 mobile                   mobile                     Pass
       Access live stream                              Stream accessible;       Stream accessible;
3      on mobile              SES-112                  video plays              video plays                Pass
                                                       Bet form functional;     Bet form functional; bet
4      Place bet on mobile    SurvivalDuration, 30     bet submitted            submitted                  Pass
Post-conditions: Mobile compatibility confirmed for all tested flows • No JavaScript errors in mobile browser console


**Test Case:** NFR-COM-1 Positive Test Case

Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-NFRCOM1-002                                     Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                          Test Designed date: 2025
Module Name: Client Layer / Viewer Portal                        Test Executed by: Mamdouh Dabjan
Test Title: System accessed on an outdated browser               Test Execution date: 2025
shows degraded or broken experience
Description: Verify that the system correctly
identifies or displays issues when accessed from an
unsupported/outdated browser, confirming that
modern browsers are required.
Pre-conditions: System is deployed • An outdated browser (e.g., Internet Explorer 11) is available for testing
Dependencies: NFR-COM-1 (Browser compatibility) • NFR-COM-2 (Modern browser requirement)
                                                                                                             Status
Step Test Steps               Test Data              Expected Result           Actual Result                 (Pass/Fail) Notes
                                                     Page fails to load or     Page fails or renders
1      Open portal on IE 11 IE 11                    has layout errors         with errors                   Pass
       Attempt to                                    Login fails due to JS     Login fails due to JS
2      authenticate           viewer06               incompatibility           incompatibility               Pass
       Observe rendering                             Broken UI elements;       Broken UI elements;
3      and functionality      N/A                    functional failures       functional failures           Pass
Post-conditions: Test documents incompatibility with unsupported browsers • Production documentation recommends modern
browsers only


**Test Case:** NFR-COM-1 Negative Test Case

### NFR-COM-2: Supported Browser Versions


Project Name: Shutter Island
                                                Test Case Template
Test Case ID: TC-NFRCOM2-001                                        Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                             Test Designed date: 2025
Module Name: Client Layer                                           Test Executed by: Mamdouh Dabjan
Test Title: Full system functionality verified on all               Test Execution date: 2025
four supported browser types
Description: Verify that the system is fully
functional on the latest stable versions of Google
Chrome, Mozilla Firefox, Microsoft Edge, and Apple
Safari.
Pre-conditions: System is deployed • Latest stable versions of Chrome, Firefox, Edge, and Safari are available • Test user accounts
exist
Dependencies: NFR-COM-1 (Browser compatibility)
                                                                                                            Status
Step Test Steps               Test Data                Expected Result          Actual Result               (Pass/Fail) Notes
       Create session on                               Session created; UI      Session created; UI
1      Chrome (latest)        Chrome latest            renders correctly        renders correctly           Pass
       Check-in participant                            Check-in succeeds; no Check-in succeeds; no
2      on Firefox             Firefox latest           issues                   issues                      Pass
       Place bet on Edge                               Bet placed; stream       Bet placed; stream
3      (latest)               Edge latest              loads correctly          loads correctly             Pass
       Access stream on                                Stream accessible; no    Stream accessible; no
4      Safari (latest)        Safari latest            errors                   errors                      Pass
Post-conditions: Cross-browser compatibility is documented • System is certified for all four browsers


**Test Case:** NFR-COM-2 Positive Test Case

Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-NFRCOM2-002                                     Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): Medium                          Test Designed date: 2025
Module Name: Client Layer                                        Test Executed by: Mamdouh Dabjan
Test Title: System functionality is impaired on an               Test Execution date: 2025
outdated browser version
Description: Verify that an outdated version of a
supported browser (e.g., Chrome 80) causes
functional or rendering issues, confirming that
'latest stable version' compliance is necessary.
Pre-conditions: An older version of a supported browser (Chrome 80) is available • System is deployed
Dependencies: NFR-COM-2 (Modern browser requirement)
                                                                                                      Status
Step   Test Steps              Test Data           Expected Result         Actual Result              (Pass/Fail) Notes
       Open dashboard on                           Rendering issues due    Rendering issues
1      Chrome 80               Chrome 80           to outdated support     observed                   Pass
       Attempt to create a                         Form may fail due to    Form fails due to
2      session                 Create session      missing JS APIs         missing JS APIs            Pass
       Observe and record                          Console errors and      Console errors and
3      errors                  N/A                 visual defects noted    visual defects noted       Pass
Post-conditions: Test results document the minimum browser version requirements • Release notes specify latest stable versions
only


**Test Case:** NFR-COM-2 Negative Test Case

### NFR-FRW-1: MySQL as Primary DBMS


Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-NFRFRW1-001                                      Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                             Test Designed date: 2025
Module Name: Data Layer / MySQL Database                          Test Executed by: Mamdouh Dabjan
Test Title: System database is confirmed to be                    Test Execution date: 2025
MySQL and all connections use MySQL protocol
Description: Verify that MySQL is the primary
DBMS used by the system, and all application
connections are established against a MySQL-
compatible database server.
Pre-conditions: System is deployed • Database configuration files are accessible to the system administrator
Dependencies: NFR-FRW-2 (Relational schema) • NFR-FRW-3 (Framework scalability)
                                                                                                           Status
Step Test Steps              Test Data               Expected Result            Actual Result              (Pass/Fail)   Notes
       Inspect DB config     db.config,              MySQL protocol             MySQL protocol
1      file                  DB_TYPE=mysql           configured                 configured                 Pass
       Verify MySQL                                  Valid MySQL version        Valid MySQL version
2      version               SELECT VERSION()        returned (8.0.x)           returned (8.0.x)           Pass
       Execute MySQL-        SELECT * FROM           Query succeeds;            Query succeeds; results
3      specific query        GameSession LIMIT 5 results returned               returned                   Pass
       Confirm no other      Check running DB        No PostgreSQL/SQLite No PostgreSQL/SQLite
4      DBMS active           processes               connections                connections                Pass
Post-conditions: MySQL compliance is documented • System configuration is verified


**Test Case:** NFR-FRW-1 Positive Test Case

Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-NFRFRW1-002                                        Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                               Test Designed date: 2025
Module Name: Data Layer / MySQL Database                            Test Executed by: Mamdouh Dabjan
Test Title: Attempt to connect using a non-MySQL                    Test Execution date: 2025
database driver fails
Description: Verify that the system does not accept or
process requests routed through a non-MySQL
database driver, ensuring MySQL is the sole DBMS in
use.
Pre-conditions: System is deployed • A non-MySQL driver (e.g., SQLite connection) is used to attempt a direct connection
Dependencies: NFR-FRW-1 (MySQL requirement)
                                                                                                           Status
Step Test Steps             Test Data                     Expected Result        Actual Result             (Pass/Fail) Notes
       Connect using                                      Connection rejected; Connection rejected;
1      SQLite driver        sqlite:///shutter_island.db MySQL only               MySQL only                Pass
       Verify error for                                   DB connection error DB connection error
2      non-MySQL            N/A                           raised                 raised                    Pass
       Confirm no data                                    No data exposure;      No data exposure;
3      accessed             N/A                           secure                 secure                    Pass
Post-conditions: Connection attempt is logged as an error • No data breach occurred


**Test Case:** NFR-FRW-1 Negative Test Case

### NFR-FRW-2: Structured Relational Schema Integrity


Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-NFRFRW2-001                                      Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                             Test Designed date: 2025
Module Name: Data Layer / MySQL Database                          Test Executed by: Mamdouh Dabjan
Test Title: FK constraints prevent orphaned records               Test Execution date: 2025
in the relational schema
Description: Verify that the structured relational
schema enforces data integrity by preventing the
creation of records that violate FK constraints.
Pre-conditions: MySQL database is operational with the full schema • A valid GameSession (SES-113) exists • No Bet record exists
for a non-existent session
Dependencies: NFR-FRW-1 (MySQL) • NFR-FRW-2 (Relational schema)
                                                                                                         Status
Step Test Steps               Test Data              Expected Result           Actual Result             (Pass/Fail) Notes
        Insert Bet with non- INSERT INTO Bet         FK constraint
1       existent SessionID    (SessionID=99999)      evaluated                 FK constraint evaluated Pass
        MySQL enforces FK                            Insert rejected; Error Insert rejected; Error
2       constraint            N/A                    1452 FK violation         1452 FK violation         Pass
                              SELECT COUNT(*)
        Verify Bet table      WHERE                  Count=0; no               Count=0; no orphaned
3       unchanged             SessionID=99999        orphaned record           record                    Pass
Post-conditions: Bet table unchanged • Database schema correctly enforces referential integrity


**Test Case:** NFR-FRW-2 Positive Test Case

Project Name: Shutter Island
                                             Test Case Template
Test Case ID: TC-NFRFRW2-002                                    Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                           Test Designed date: 2025
Module Name: Data Layer / MySQL Database                        Test Executed by: Mamdouh Dabjan
Test Title: Deleting a referenced GameSession with              Test Execution date: 2025
active Bet records is blocked
Description: Verify that the database prevents
deletion of a GameSession record while Bet records
with an FK reference to it still exist, maintaining
referential integrity.
Pre-conditions: GameSession SES-114 exists with two associated Bet records • The Bet table has a FK to GameSession with
RESTRICT or NO ACTION delete rule
Dependencies: NFR-FRW-2 (Relational schema) • NFR-FRW-1 (MySQL)
                                                                                                         Status
Step Test Steps             Test Data                Expected Result          Actual Result              (Pass/Fail) Notes
       DELETE               DELETE FROM
       GameSession SES-     GameSession WHERE FK constraints in Bet           FK constraints in Bet
1      114                  SessionID='SES-114'      table evaluated          table evaluated            Pass
                                                     DELETE rejected;
       MySQL enforces FK                             Error 1451 FK            DELETE rejected; Error
2      constraint           N/A                      violation                1451 FK violation          Pass
                            SELECT * FROM
       Verify SES-114 still GameSession WHERE Record present;                 Record present;
3      exists               SessionID='SES-114'      deletion blocked         deletion blocked           Pass
Post-conditions: GameSession SES-114 and its Bet records remain intact • DB integrity is confirmed


**Test Case:** NFR-FRW-2 Negative Test Case

### NFR-FRW-3: Concurrent Session Management via Row-Level Locking


Project Name: Shutter Island
                                              Test Case Template
Test Case ID: TC-NFRFRW3-001                                     Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                            Test Designed date: 2025
Module Name: Data Layer / MySQL Database                         Test Executed by: Mamdouh Dabjan
Test Title: Concurrent elimination events are                    Test Execution date: 2025
processed without data conflict using row-level
locking
Description: Verify that when two concurrent
processes attempt to update the same session player
record (e.g., two simultaneous elimination events),
row-level locking prevents data conflict and both
operations complete correctly.
Pre-conditions: Session SES-115 is Active with two players (P-20, P-21) both in the same room • Two concurrent elimination
requests are submitted simultaneously
Dependencies: NFR-FRW-2 (Relational schema) • SR-GAME-2 (Elimination processing)
                                                                                                         Status
Step Test Steps               Test Data               Expected Result           Actual Result            (Pass/Fail) Notes
       Send concurrent        Thread1: P-20,          Both arrive               Both arrive
1      eliminate requests     Thread2: P-21           simultaneously            simultaneously           Pass
                              Locks on (SES-115,P-
       Row-level locks        20) and (SES-115,P-     Different rows            Different rows locked;
2      applied                21)                     locked; no deadlock       no deadlock              Pass
                                                      P-20, P-21                P-20, P-21
       Both transactions                              IsAlive=FALSE; no         IsAlive=FALSE; no
3      complete               N/A                     partial state             partial state            Pass
                              SELECT * FROM
       Verify Elimination     Elimination WHERE       Two records; no           Two records; no
4      table                  SessionID='SES-115'     duplicates                duplicates               Pass
Post-conditions: Session SES-115 has two eliminated players • No data corruption • Row-level locking confirmed to be working


**Test Case:** NFR-FRW-3 Positive Test Case

Project Name: Shutter Island
                                               Test Case Template
Test Case ID: TC-NFRFRW3-002                                       Test Designed by: Mamdouh Dabjan
Test Priority (Low/Medium/High): High                              Test Designed date: 2025
Module Name: Data Layer / MySQL Database                           Test Executed by: Mamdouh Dabjan
Test Title: Transaction rollback ensures no partial                Test Execution date: 2025
state when concurrent session update fails mid-
operation
Description: Verify that when a multi-step session
state update fails midway (e.g., network error
between steps), the transaction rolls back completely
and leaves no partial state in the database.
Pre-conditions: Session SES-116 is Active • A multi-step operation (eliminate player + unlock next room) is in progress • A
simulated error is injected after the first step but before the second
Dependencies: NFR-FRW-3 (Transaction management) • SR-GAME-2 (Elimination processing)
                                                                                                             Status
Step Test Steps                  Test Data                 Expected Result        Actual Result              (Pass/Fail) Notes
       Begin txn: set
       IsAlive=FALSE for P-                                Step 1 completes       Step 1 completes within
1      30                        SES-116, P-30             within open txn        open txn                   Pass
                                                           Transaction            Transaction
       Simulate error            DB timeout after step interrupted; rollback      interrupted; rollback
2      before step 2             1                         triggered              triggered                  Pass
                                 SELECT IsAlive            IsAlive=TRUE;
       Verify step 1 change      WHERE PlayerID='P- elimination rolled            IsAlive=TRUE;
3      rolled back               30'                       back                   elimination rolled back    Pass
                                 SELECT Status
       Verify room NOT           WHERE
4      unlocked                  RoomIndex=2               Room 2 still Locked    Room 2 still Locked        Pass
Post-conditions: Session SES-116 is in its pre-operation state • Rollback event is logged • The operation can be safely retried


**Test Case:** NFR-FRW-3 Negative Test Case

# X. Appendices


## X.1 Hardware Requirements
Purpose: This appendix specifies the hardware configurations required to operate the “Shut-
ter Island” system efficiently. The configurations cover both minimum and recommended
setups to ensure smooth operation of all system modules, including session management,
live streaming, game engine processing, and observer betting functionalities.


### X.1.1 Minimum Hardware Requirements

These specifications support basic system operation for a single room and a moderate
number of concurrent users.
Server:

     • CPU: Quad-core 2.5 GHz or higher

     • RAM: 16 GB

     • Storage: 500 GB SSD

     • Network: 1 Gbps LAN

Client Terminals (Admin, Staff, Participants, viewers):

     • CPU: Dual-core 2.0 GHz

     • RAM: 4 GB

     • Storage: 50 GB HDD/SSD

     • Display: 1080p resolution

     • Network: 100 Mbps LAN

### X.1.2 Recommended Hardware Requirements

These specifications ensure optimal performance for multiple rooms, concurrent sessions,
and full live streaming with multiple viewers.
Server:

   • CPU: Octa-core 3.0 GHz or higher

   • RAM: 32 GB

   • Storage: 1 TB SSD

   • Network: 10 Gbps LAN

Client Terminals:

   • CPU: Quad-core 2.5 GHz

   • RAM: 8 GB

   • Storage: 256 GB SSD

   • Display: 1080p–4K resolution

   • Network: 1 Gbps LAN


### X.1.3 Optional Hardware Enhancements

These suggestions support multiple concurrent sessions, optimal live-streaming, and ob-
server interaction:

   • Sensor systems for enhanced room interactivity (motion detection, pressure sensors,
     AR/VR devices)

   • Projectors or large display screens for immersive environments

   • Uninterruptible power supply (UPS) for server and client terminals to prevent data
     loss

## X.2 Database Requirements

### X.2.1 Purpose

This appendix defines the logical database structure of the “Shutter Island” system. It
specifies tables, attributes, primary and foreign keys, constraints, and entity relationships
required to support session management, gameplay progression, elimination tracking, live
streaming, viewer access control, and administrative auditing.
The database is implemented using a structured relational schema (MySQL) to ensure data
integrity, transactional consistency, controlled progression logic, enforcement of gameplay
rules, and secure access management.

**Diagram:** Database Schema Overview (High-level entity relationships).


### X.2.2 Logical Schema Overview

The schema is organized into five functional categories:

   1. Administration

   2. Player & Session Management

   3. Gameplay & Progression Control

   4. Streaming & Viewer Access

   5. Auditing & Monitoring

Each table is defined below with its purpose, attributes, and constraints.


### X.2.3 Table Definitions

Administration Tables

1. Manager
Purpose: Stores system administrators responsible for managing sessions, rooms, live
streams, and environment events.
Attributes:

• ManagerID (Primary Key)

   • Username (UNIQUE)

   • Email (UNIQUE)

   • PasswordHash

   • Role (Admin / Moderator)

   • Status (Active / Suspended)

   • CreatedAt

   • LastLoginAt (nullable)

Constraints:

   • UNIQUE(Username)

   • UNIQUE(Email)

   • Role CHECK constraint

   • Status CHECK constraint


Player & Session Management

2. Player
Purpose: Stores participants created and managed by administrators. Players do not have
login credentials.
Attributes:

   • PlayerID (Primary Key)

   • DisplayName

   • Status (Active / Disabled)

   • CreatedAt

Constraints:

   • Status CHECK constraint

3. GameSession
Purpose: Represents a complete game match containing multiple sequential rooms.
Attributes:

    • SessionID (Primary Key)

    • SessionCode (UNIQUE)

    • CreatedByManagerID (Foreign Key → Manager)

    • MinPlayers

    • MaxPlayers

    • Status (Lobby / Active / Finished / Cancelled / Paused)

    • CreatedAt

    • StartedAt (nullable)

    • EndedAt (nullable)

Constraints:

    • UNIQUE(SessionCode)

    • CHECK(MaxPlayers BETWEEN 2 AND 10)

    • CHECK(EndedAt > StartedAt) when both exist

4. SessionPlayer
Purpose: Associates players with a specific game session and tracks their overall survival
state.
Attributes:

    • SessionID (Composite PK, FK → GameSession)

    • PlayerID (Composite PK, FK → Player)

    • SlotNumber (1–5)

    • JoinedAt

    • IsAlive (default TRUE)

• EliminatedAt (nullable)

   • FinalRank (nullable)

Constraints:

   • Composite Primary Key (SessionID, PlayerID)

   • UNIQUE(SessionID, SlotNumber)

   • CHECK(SlotNumber BETWEEN 1 AND 5)

   • If IsAlive = FALSE → EliminatedAt IS NOT NULL

Business Rule: If IsAlive = FALSE, the player is permanently eliminated from the session.


Gameplay & Progression Control

5. Room
Purpose: Stores reusable level templates.
Attributes:

   • RoomID (Primary Key)

   • Name (UNIQUE)

   • Description

   • DifficultyLevel

   • SequenceOrder

   • TimeLimitSeconds (nullable)

   • EliminationRule

Constraints:

   • UNIQUE(Name)

   • CHECK(TimeLimitSeconds > 0) if not null

6. SessionRoom
Purpose: Represents a room instance within a specific GameSession.
Attributes:

   • SessionRoomID (Primary Key)

   • SessionID (Foreign Key → GameSession)

   • RoomID (Foreign Key → Room)

   • RoomIndex (1, 2, 3. . . )

   • Status (Pending / Active / Completed / Failed / Locked)

   • StartedAt (nullable)

   • EndedAt (nullable)

   • MinEliminationsToUnlock (default 1)

   • UnlockedNextRoomAt (nullable)

Constraints:

   • UNIQUE(SessionID, RoomIndex)

   • CHECK(RoomIndex ≥ 1)

   • CHECK(MinEliminationsToUnlock ≥ 1)

Critical Game Rule: A room may unlock the next room only if:

COUNT(Elimination WHERE SessionRoomID = currentRoom) ≥ MinEliminationsToUnlock


7. SessionRoomPlayer
Purpose: Tracks which players entered each room within a session.
Attributes:

   • SessionRoomID (Composite PK, FK → SessionRoom)

   • PlayerID (Composite PK, FK → Player)

   • EnteredAt

• Status (Active / EliminatedInThisRoom / SurvivedRoom)

Constraints:

   • Composite Primary Key (SessionRoomID, PlayerID)

Progression Rule: Only players with IsAlive = TRUE in SessionPlayer may be inserted
into subsequent SessionRoomPlayer records.
8. Elimination
Purpose: Records elimination events for players removed from a session.
Attributes:

   • EliminationID (Primary Key)

   • SessionID (Foreign Key → GameSession)

   • SessionRoomID (Foreign Key → SessionRoom, NOT NULL)

   • PlayerID (Foreign Key → Player)

   • Reason (Timeout / Hazard / et3. )

   • Timestamp

Constraints:

   • UNIQUE(SessionID, PlayerID)

Enforced Rule: When elimination occurs:

   • SessionPlayer.IsAlive = FALSE

   • SessionPlayer.EliminatedAt = Timestamp

A player can be eliminated only once per session.
9. Challenge
Purpose: Stores reusable challenge templates.
Attributes:

   • ChallengeID (Primary Key)

• Title

   • ChallengeType

   • Description

   • DefaultDurationSeconds (nullable)

10. RoomChallenge
Purpose: Maps challenges to rooms in a defined sequence.
Attributes:

   • RoomID (Composite PK, FK → Room)

   • ChallengeID (Composite PK, FK → Challenge)

   • OrderInRoom

   • IsMandatory

   • CustomDurationSeconds (nullable)

Constraints:

   • Composite Primary Key (RoomID, ChallengeID)

   • UNIQUE(RoomID, OrderInRoom)

   • CHECK(OrderInRoom ≥ 1)

11. EnvironmentEvent
Purpose: Stores synchronized system or manager-triggered events during gameplay.
Attributes:

   • EventID (Primary Key)

   • SessionID (FK → GameSession)

   • SessionRoomID (FK → SessionRoom)

   • EventType

   • PayloadJSON

• TriggeredBy (“System” / “Manager”)

   • TriggeredByManagerID (nullable FK → Manager)

   • CreatedAt

Constraints:

   • If TriggeredBy = “Manager” → TriggeredByManagerID NOT NULL

   • If TriggeredBy = “System” → TriggeredByManagerID NULL


Streaming & Viewer Access

12. LiveStream
Purpose: Stores streaming metadata for a session.
Attributes:

   • StreamID (Primary Key)

   • SessionID (FK → GameSession)

   • StreamStatus (Offline / Live / Ended / Paused)

   • StreamURL

   • EncryptionMode

   • StartedAt

   • EndedAt

   • CreatedAt

Constraints:

   • UNIQUE(SessionID)

   • CHECK(EndedAt > StartedAt) if both exist

13. ViewerAccessKey
Purpose: Stores viewer access keys issued after paywall authorization.
Attributes:

• AccessID (Primary Key)

    • StreamID (FK → LiveStream)

    • ViewerIdentifier

    • AccessKey (UNIQUE)

    • AccessStatus (Active / Revoked / Expired)

    • IssuedAt

    • ExpiresAt (nullable)

    • IssuedByManagerID (nullable FK → Manager)

    • LastUsedAt (nullable)

Constraints:

    • UNIQUE(AccessKey)

    • UNIQUE(StreamID, ViewerIdentifier)

    • CHECK(ExpiresAt > IssuedAt) if expiry exists


Auditing

14. AuditLog
Purpose: Stores administrative actions for auditing and traceability.
Attributes:

    • AuditID (Primary Key)

    • ManagerID (FK → Manager)

    • SessionID (nullable FK → GameSession)

    • ActionType

    • ActionTime

15. Bet
Purpose: Stores viewer bets placed on predefined session outcomes and tracks settlement
results.
Attributes:

   • BetID (Primary Key)

   • SessionID (Foreign Key → GameSession)

   • StreamID (Foreign Key → LiveStream)

   • PlayerID (Foreign Key → Player, nullable depending on bet type)

   • ViewerIdentifier

   • BetType

   • BetAmount

   • PredictedOutcome

   • ActualOutcome (nullable)

   • Status (Pending / Won / Lost / Cancelled)

   • CreatedAt

   • SettledAt (nullable)

Constraints:

   • CHECK(BetAmount > 0)

   • Status defaults to “Pending”

   • FOREIGN KEY (SessionID) → GameSession

   • FOREIGN KEY (StreamID) → LiveStream

   • FOREIGN KEY (PlayerID) → Player (nullable)

### X.2.4 Relationship Summary

The database enforces the following relationship types:

    • Manager → GameSession (1–N)

    • GameSession ↔ Player (M–N via SessionPlayer)

    • GameSession → SessionRoom (1–N)

    • Room → SessionRoom (1–N)

    • SessionRoom ↔ Player (M–N via SessionRoomPlayer)

    • SessionRoom → Elimination (1–N)

    • Player → Elimination (1–0/1 per session)

    • GameSession → Elimination (1–N)

    • Room ↔ Challenge (M–N via RoomChallenge)

    • GameSession → EnvironmentEvent (1–N)

    • SessionRoom → EnvironmentEvent (1–N)

    • GameSession → LiveStream (1–1)

    • LiveStream → ViewerAccessKey (1–N)

    • Manager → AuditLog (1–N)

    • GameSession → Bet (1–N)

    • LiveStream → Bet (1–N)

    • Player → Bet (0–N)


### X.2.5 Critical Business Rules

   1. A player may be eliminated only once per GameSession.

   2. A SessionRoom unlocks the next room only if required eliminations are met.

   3. Only players marked IsAlive = TRUE may progress to subsequent rooms.

4. Each GameSession may have at most one LiveStream.

  5. Access keys are unique and cannot be reused across viewers for the same stream.

  6. Each Bet must reference a valid GameSession and LiveStream. Bet results shall be
     evaluated automatically upon session completion. A bet transitions from “Pending”
     to either “Won” or “Lost” once settlement logic executes.

  7. A GameSession with Status = ‘Finished’ must have exactly one SessionPlayer record
     where IsAlive = TRUE.

  8. If a GameSession is cancelled before it reaches ‘Finished’ status or paused and does
     not resume, all associated Pending bets shall be automatically set to ‘Cancelled’ and
     refunds processed through the payment gateway.


## X.3 Requirements Traceability Matrix
This appendix presents the Requirements Traceability Matrix (RTM) for the Shutter Island
system. Each user requirement (UR) is mapped to the system requirements (SR) derived
from it. System requirements with no direct UR parent are system-level elaborations
introduced during architectural design and are listed separately in the table.

**Table:** UR-to-SR Traceability Mapping

 User Requirements     Description                        Derived System Requirements
 Session Administration (UR-SES)
 UR-SES-1              View and manage active ses-        SR-MON-1
                       sions through a user interface
 UR-SES-2              Create, modify, or close ses-      SR-SES-1, SR-SES-2, SR-SES-3
                       sion time slots
 UR-SES-3              Register participant informa-      SR-PAR-1
                       tion prior to session initiation
 UR-SES-4              Assign a unique tracking iden-     SR-PAR-1
                       tifier to each participant
 UR-SES-5              Verify all selected participants   SR-PAR-2
                       are present before initiating

User Requirements       Description                         Derived System Requirements
UR-SES-6                Initiate a session timer when a     SR-GAME-1
                        game session begins
UR-SES-7                Pause, resume, or terminate an      SR-MON-2
                        active session
UR-SES-8                Support multiple concurrent         NFR-FRW-3, NFR-SCA-1
                        sessions without data conflict
Game Monitoring (UR-GAME)
UR-GAME-1               Visually indicate elimination       SR-MON-1, SR-PAR-3
                        status of participants
UR-GAME-2               Display real-time session status    SR-MON-1
                        on administrator dashboard
UR-GAME-3               Calculate and display group SR-GAME-4, SR-GAME-5
                        performance metrics at session
                        completion
UR-GAME-4               Maintain individual participant     SR-GAME-3, SR-GAME-4, SR-DAT-
                        performance records                 1
UR-GAME-5               Store session history for report-   SR-DAT-1, SR-DAT-2, SR-DAT-3
                        ing and analytical purposes
Authentication and Access Control (UR-SEC)
UR-SEC-1                Authenticate staff users before     SR-SEC-1, NFR-SEC-1
                        granting system access
UR-SEC-2                Restrict system access based on     SR-SEC-2, NFR-SEC-1
                        assigned user roles
UR-SEC-3                Authenticate viewer accounts SR-SEC-3, SR-SEC-4, SR-SEC-5
                        before granting viewing ser-
                        vices
Live Streaming (UR-STR)

User Requirements       Description                       Derived System Requirements
UR-STR-1                Provide authorized viewers ac- SR-STR-1, SR-STR-2
                        cess to a live-streaming inter-
                        face
UR-STR-2                Encrypt live-streaming data to    SR-STR-3, NFR-SEC-2
                        prevent unauthorized access
UR-STR-3                Record viewer access activity     SR-STR-4, NFR-SEC-5
                        for monitoring and auditing
Payment and Betting (UR-BET)
UR-BET-1                Allow authorized viewers to SR-BET-1
                        place bets on session partici-
                        pants
UR-BET-2                Validate bet placement only af- SR-BET-2, SR-BET-7
                        ter successful payment autho-
                        rization
UR-BET-3                Record bet details including SR-BET-3
                        identity, outcome, and times-
                        tamp
UR-BET-4                Automatically evaluate session SR-BET-4
                        outcomes to determine bet re-
                        sults
UR-BET-5                Calculate bet payouts based on    SR-BET-4, SR-BET-5
                        predefined system rules
UR-BET-6                Update viewer accounts based      SR-BET-4
                        on bet results
UR-BET-7                Maintain a complete bet history   SR-BET-3, SR-BET-5, SR-BET-6
                        for reporting and auditing
UR-BET-8                Integrate with an external pay-   SR-SES-4, SR-BET-7
                        ment processing system

**Table:** System-Level Elaborations (No Direct UR Parent)

System Requirements   Rationale
SR-GAME-2             Engine progression logic required by overall game design; no single
                      UR mandates this rule explicitly
SR-GAME-5             Win condition and final rank assignment; system-level rule derived
                      from game design constraints
SR-BET-8              Automatic refund on session cancellation; system-level safeguard not
                      explicitly stated in any UR
NFR-PER-1             Response time constraint; operational performance standard derived
                      from system context
NFR-PER-2             Concurrent user capacity; scalability constraint derived from ex-
                      pected operational load
NFR-PER-3             Live-stream stability; performance constraint derived from streaming
                      subsystem design
NFR-SEC-3             Data encryption at rest; security constraint beyond explicit UR scope
NFR-SEC-4             Subsystem separation between gameplay and betting; architectural
                      security constraint
NFR-REL-1             Operational availability; reliability constraint derived from business
                      operating hours
NFR-REL-2             Daily database backups; data protection constraint derived from sys-
                      tem design
NFR-REL-3             Recovery time objective; resilience constraint derived from opera-
                      tional requirements
NFR-REL-4             Data integrity through transactions; consistency constraint derived
                      from database design
NFR-SCA-2             Database expandability; scalability constraint derived from long-term
                      system evolution
NFR-USA-1             Intuitive UI for staff; usability constraint derived from operational
                      context

System Requirements       Rationale
NFR-USA-2                 Visual status indicators; usability constraint derived from monitoring
                          requirements
NFR-USA-3                 Minimized user actions; efficiency constraint derived from adminis-
                          trative workflow
NFR-COM-1                 Browser and device accessibility; compatibility constraint derived
                          from deployment context
NFR-COM-2                 Browser version support; compatibility constraint derived from de-
                          ployment context
NFR-FRW-1                 MySQL as DBMS; technology selection derived from architectural
                          decisions
NFR-FRW-2                 Relational schema structure; data consistency constraint derived from
                          database design
