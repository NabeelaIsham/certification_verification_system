import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    'protection', Path(__file__).resolve().parents[2] / 'Scripts/protect-main.py'
)
protection = importlib.util.module_from_spec(spec)
spec.loader.exec_module(protection)


class BranchProtectionTest(unittest.TestCase):
    def setUp(self):
        self.requested = {
            'required_status_checks': {'contexts': protection.CHECKS},
            'required_pull_request_reviews': {
                'required_approving_review_count': 1, 'require_code_owner_reviews': False,
                'require_last_push_approval': False,
            },
            'required_linear_history': False,
        }
        self.actual = {
            'required_status_checks': {'strict': True, 'contexts': protection.CHECKS},
            'required_pull_request_reviews': {'required_approving_review_count': 1, 'dismiss_stale_reviews': True},
            'enforce_admins': {'enabled': True}, 'allow_force_pushes': {'enabled': False},
            'allow_deletions': {'enabled': False}, 'required_conversation_resolution': {'enabled': True},
        }

    def test_full_baseline_is_confirmed(self):
        self.assertTrue(protection.protection_matches(self.actual, self.requested))

    def test_each_missing_protection_fails_verification(self):
        for field in self.actual:
            with self.subTest(field=field):
                actual = copy.deepcopy(self.actual)
                del actual[field]
                self.assertFalse(protection.protection_matches(actual, self.requested))

    def test_missing_check_or_approval_fails(self):
        self.actual['required_status_checks']['contexts'] = protection.CHECKS[:-1]
        self.assertFalse(protection.protection_matches(self.actual, self.requested))
        self.actual['required_status_checks']['contexts'] = protection.CHECKS
        self.actual['required_pull_request_reviews']['required_approving_review_count'] = 0
        self.assertFalse(protection.protection_matches(self.actual, self.requested))


if __name__ == '__main__':
    unittest.main()
