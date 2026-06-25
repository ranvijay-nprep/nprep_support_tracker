import argparse
import json
import os
from datetime import datetime

DATA_FILE = "tickets.json"
VALID_PRIORITIES = {"high", "medium", "low"}


def load_tickets():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE) as f:
        return json.load(f)


def save_tickets(tickets):
    with open(DATA_FILE, "w") as f:
        json.dump(tickets, f, indent=2)


def cmd_add(args):
    if args.priority not in VALID_PRIORITIES:
        print(f"Error: priority must be one of {sorted(VALID_PRIORITIES)}")
        return
    tickets = load_tickets()
    ticket = {
        "id": len(tickets) + 1,
        "title": args.title,
        "priority": args.priority,
        "status": "open",
        "created_at": datetime.utcnow().isoformat(),
    }
    tickets.append(ticket)
    save_tickets(tickets)
    print(f"Added ticket #{ticket['id']}: {ticket['title']} [{ticket['priority']}]")


def cmd_list(args):
    tickets = load_tickets()
    filtered = [t for t in tickets if args.status == "all" or t["status"] == args.status]
    if not filtered:
        print(f"No {args.status} tickets." if args.status != "all" else "No tickets.")
        return
    for t in filtered:
        print(f"  #{t['id']} [{t['priority']:6}] [{t['status']:8}] {t['title']}")


def cmd_resolve(args):
    tickets = load_tickets()
    for t in tickets:
        if t["id"] == args.id:
            if t["status"] == "resolved":
                print(f"Ticket #{args.id} is already resolved.")
                return
            t["status"] = "resolved"
            save_tickets(tickets)
            print(f"Resolved ticket #{args.id}: {t['title']}")
            return
    print(f"Ticket #{args.id} not found.")


def main():
    parser = argparse.ArgumentParser(description="nprep support ticket tracker")
    sub = parser.add_subparsers(dest="command")

    add_p = sub.add_parser("add", help="Add a new ticket")
    add_p.add_argument("title", help="Ticket title")
    add_p.add_argument("--priority", default="medium", choices=VALID_PRIORITIES)
    add_p.set_defaults(func=cmd_add)

    list_p = sub.add_parser("list", help="List tickets")
    list_p.add_argument("--status", default="open", choices=["open", "resolved", "all"],
                        help="Filter by status (default: open)")
    list_p.set_defaults(func=cmd_list)

    resolve_p = sub.add_parser("resolve", help="Mark a ticket resolved")
    resolve_p.add_argument("id", type=int, help="Ticket ID")
    resolve_p.set_defaults(func=cmd_resolve)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return
    args.func(args)


if __name__ == "__main__":
    main()
