CREATE TABLE account (
    id SERIAL PRIMARY KEY,
    email VARCHAR(64) NOT NULL,
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE slack_client (
    id SERIAL PRIMARY KEY,
    api_client_id VARCHAR(64) NOT NULL,
    api_client_secret VARCHAR(64) NOT NULL,
    signing_secret VARCHAR(64) NOT NULL,
    name VARCHAR(64) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE slack_client_account_membership (
    account_id INTEGER NOT NULL,
    slack_client_id INTEGER NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, slack_client_id)
);

CREATE TABLE slack_oauth_state (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    slack_client_id INTEGER NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redeemed TIMESTAMP
);

CREATE TABLE slack_integration (
    id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    slack_client_id INTEGER NOT NULL,
    team_id VARCHAR(64) NOT NULL,
    team_name VARCHAR(64) NOT NULL,
    bot_user_id VARCHAR(16) NOT NULL,
    app_id VARCHAR(16) NOT NULL,
    access_token VARCHAR(128) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE slack_event (
    id SERIAL PRIMARY KEY,
    slack_integration_id INTEGER NOT NULL,
    event JSONB NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed TIMESTAMP
);

CREATE TABLE slack_chat (
    id SERIAL PRIMARY KEY,
    slack_integration_id INTEGER NOT NULL,
    channel_id VARCHAR(64) NOT NULL,
    thread_ts VARCHAR(64) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE slack_chat_round (
    id SERIAL PRIMARY KEY,
    slack_chat_id INTEGER NOT NULL,
    round JSONB NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);