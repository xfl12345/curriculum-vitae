CREATE TABLE IF NOT EXISTS meet_hr
(
    id                 INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    create_time        TEXT DEFAULT (datetime('now')),
    first_visit_time   TEXT DEFAULT NULL,
    last_visit_time    TEXT DEFAULT NULL,
    hr_name            TEXT DEFAULT NULL,
    hr_phone_number    TEXT DEFAULT NULL,
    hr_job             TEXT DEFAULT NULL,
    my_job             TEXT DEFAULT NULL,
    note               TEXT DEFAULT NULL
);
