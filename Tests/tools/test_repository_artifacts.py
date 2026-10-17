import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    'repository_artifacts', Path(__file__).resolve().parents[2] / 'Scripts/check-repository-artifacts.py'
)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class RepositoryArtifactsTest(unittest.TestCase):
    def test_secret_and_recovery_files_are_rejected(self):
        for name in [
            'Backend/.env', 'Frontend/.env.production', '.env.local',
            '.local-secrets/admin.credential.xml', 'exports/admin.credential.xml',
            'Backend/backups/snapshot.archive.gz', 'backup/config.dpapi',
            '.history-cleanup/repository.git/config', r'Backend\Backups\snapshot.zip',
            'nested/.local-secrets/account.txt',
        ]:
            with self.subTest(name=name):
                self.assertTrue(guard.forbidden_path(name))

    def test_templates_and_source_files_are_allowed(self):
        for name in [
            'Backend/.env.example', '.env.production.example', 'deploy/.env.template',
            'Backend/scripts/backupDatabase.js', 'Docs/SECURITY_REMEDIATION.md',
            '.github/workflows/ci.yml', 'Frontend/src/config/environment.js',
        ]:
            with self.subTest(name=name):
                self.assertFalse(guard.forbidden_path(name))


if __name__ == '__main__':
    unittest.main()
