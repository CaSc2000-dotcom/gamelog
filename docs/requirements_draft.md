# GameLog Requirements Draft

## MVP

> The primary users will mainly be students, hobbyist gamers, streamers, and completion-focused players with large libraries. Busy gamers tend to forget many things about their game sessions, and streamers/hobbyists/completion-focused players want to be able to remember/chronicle their gaming experiences using word processing and media. GameLog seeks to provide one cohesive platform on which users can sort their gaming backlog into completion categories, reflect/record gaming sessions, and store media related to their sessions. The first working version will allow the user to manage their game library (playing, completed, not started, etc.), record entries with game metadata attached (IGDB), store media (screenshots), and see simple insights.

## Must-Haves

1. The system shall ensure each authenticated user can only access their own games, sessions, and media.
2. The system shall support CRUD operations of a user's game backlog, including backlog status -- "wishlist", "in progress", "on hold", "completed", "dropped".
3. The user can search/select a game from IGDB (or similar) when adding a game.
4. The user can create a session with a date, duration, and notes (short/very long OK) which belong to exactly one game
5. The system shall support multiple user-uploaded screenshots attached to a session which are viewable, deletable, and persist after refresh
6. The user can filter their gaming backlog by status and sessions by game and date range
7. The user can view an insights dashboard that features total count of games per status, activity (sessions) within the last 7 days, per-game last session date on the backlog or game detail view, and total sessions (lifetime and in the last 7 days).

## Nice-To-Haves

1. The system shall support user-uploaded video clips with limitations -- 30 seconds maximum, 720p resolution maximum, 4000 kbps bitrate maximum
2. The user can utilize full-text search within their data entries/sessions with a preview list of the top three results
3. The user can import and export their data using JSON
4. The system shall provide richer analytics including charts of game library composition, total activity in select games, and similar games the user might enjoy
5. The system shall give the user "stale backlog" nudges that remind the user of games that have not seen activity in over 7 days.

## Non-Functional Guardrails

Platform: The app shall be developed as a web application prioritizing the desktop experience, accessible on any modern web browser.

Authentication: The app shall use OAuth as its authentication method -- OAuth for MVP (e.g. Google); additional providors out of scope

Media: Screenshots will be capped at 50 MB per session. Total number of images within a session will be dependent on quality (typical 1080p high complexity PNG = ~6 MB -> ~48 MB = ~8 screenshots)

Privacy: Journal data will be completely private to the user with no native feature to share their sessions (could be expanded upon after MVP developed)