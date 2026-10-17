"""Reject tracked runtime secrets and recovery artifacts without reading their contents."""
from pathlib import PurePosixPath
import subprocess
import sys


def forbidden_path(name):
    path = PurePosixPath(name.replace('\\', '/').lower())
    parts = path.parts
    if any(part in {'.local-secrets', '.history-cleanup'} for part in parts):
        return True
    if any(parts[index:index + 2] == ('backend', 'backups') for index in range(len(parts) - 1)):
        return True
    if path.name.endswith(('.credential.xml', '.dpapi')):
        return True
    if path.name == '.env' or path.name.startswith('.env.'):
        return not path.name.endswith(('.example', '.template'))
    return False


def main():
    result = subprocess.run(['git', 'ls-files', '-z'], check=True, capture_output=True)
    files = result.stdout.decode('utf-8', errors='surrogateescape').split('\0')
    blocked = sorted(name for name in files if name and forbidden_path(name))
    if blocked:
        print('Remove these secret/recovery artifacts from the proposed source tree:')
        for name in blocked:
            print(ascii(name))
        print('This check does not clean existing Git history or revoke exposed credentials.')
        return 1
    print('Tracked source tree contains no forbidden environment, credential-export or recovery artifacts.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
