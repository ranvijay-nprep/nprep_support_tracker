import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import tracker


class TestTracker(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        self.tmp.close()
        tracker.DATA_FILE = self.tmp.name
        with open(tracker.DATA_FILE, "w") as f:
            json.dump([], f)

    def tearDown(self):
        os.unlink(self.tmp.name)

    def test_add_ticket(self):
        class Args:
            title = "Test bug"
            priority = "high"

        tracker.cmd_add(Args())
        tickets = tracker.load_tickets()
        self.assertEqual(len(tickets), 1)
        self.assertEqual(tickets[0]["title"], "Test bug")
        self.assertEqual(tickets[0]["status"], "open")

    def test_resolve_ticket(self):
        class AddArgs:
            title = "Fix me"
            priority = "low"

        class ResolveArgs:
            id = 1

        tracker.cmd_add(AddArgs())
        tracker.cmd_resolve(ResolveArgs())
        tickets = tracker.load_tickets()
        self.assertEqual(tickets[0]["status"], "resolved")

    def test_invalid_priority(self, capsys=None):
        class Args:
            title = "Bad ticket"
            priority = "urgent"

        tracker.cmd_add(Args())
        tickets = tracker.load_tickets()
        self.assertEqual(len(tickets), 0)


if __name__ == "__main__":
    unittest.main()
