# Berlioz

## Summary

Berlioz is a Slack bot that responds to prompts -- mentions or DMs -- with text generated from Google's Gemini generative AI.

Note: This is a work in progress being built in the open.

## Architecture

There are two main components to Berlioz:

1. The Slack bot. This is responsible for registering itself with Slack via OAuth and then exposing an Events API webhook URL that will receive the mentions and DMs. When it receives a request, it is saved to a PostgreSQL database.
2. The Berlioz Worker. This runs in a constant loop, reading the queue of incoming image requests from the PostgreSQL database, generating the responses, and returning them to Slack.

## Running the Applications

### Creating the Database

```
CREATE DATABASE berlioz;
CREATE USER berlioz WITH PASSWORD '<password>';
GRANT ALL PRIVILEGES ON DATABASE berlioz TO berlioz;
ALTER DATABASE berlioz OWNER TO berlioz;
```

Now you can connect to the `berlioz` database and create the tables in `schema/init.sql`.

### Environment Variables

```
export BERLIOZ_DOWNLOAD_PATH='<path for downloaded files>'
export BERLIOZ_LISTENER_HOSTNAME='<hostname for oauth redirect>'

export GEMINI_API_KEY='<gemini api key>'

export PGUSER='berlioz'
export PGPASSWORD='<password>'
export PGHOST='<database hostname>'
export PGPORT=5432
export PGDATABASE='berlioz'

export PG_CA_CERT='<optional postgresql ca certificate>'
export PG_CLIENT_CERT='<optional postgresql tls certificate>'
export PG_CLIENT_KEY='<optional postgresql tls key>'
```

### Running the Listener and Worker

After transpiling the Typescript to Javascript with `tsc`, one can run the listener and worker with the following commands:

```
NODE_PATH=$( pwd ) node index.js
NODE_PATH=$( pwd ) node worker.js
```

### Setting up the Slack Application

Edit `appManifest.json` according to your environment, and use it to create your Slack application at https://api.slack.com/apps.

Once you have your client ID and client secret, you must add them to the database:

```
berlioz=> INSERT INTO account (email, first_name, last_name) VALUES ('email@domain', 'First', 'Last') RETURNING id;
 id
----
  1
(1 row)

INSERT 0 1
berlioz=> INSERT INTO slack_client (api_client_id, api_client_secret, name) VALUES ('client_id', 'client_secret', 'team_name') RETURNING id;
 id
----
  1
(1 row)
```

Now you can use the `/api/v1/berlioz/slack-redirect-link` endpoint to get a link to the URL to install your application in your Slack workspace.

```
$ curl `http://localhost:12030/api/v1/berlioz/slack-redirect-link?account_id=1&slack_client_id=1`
```

Visit the link in your browser, approve the requested permissions, and now you can invite @Berlioz into your channels for chatting.