# nprep Support Tracker

A lightweight CLI tool for tracking support tickets during nprep sessions.

## Features

- Log new support tickets with a title and priority
- List open tickets
- Mark tickets as resolved

## Usage

```bash
python tracker.py add "Login page broken" --priority high
python tracker.py list
python tracker.py resolve 1
```

## Setup

```bash
pip install -r requirements.txt
python tracker.py --help
```

## Ticket Priorities

| Priority | Description              |
|----------|--------------------------|
| high     | Blocks user from working |
| medium   | Workaround exists        |
| low      | Minor inconvenience      |
