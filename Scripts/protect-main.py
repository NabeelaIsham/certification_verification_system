"""Apply the requested main protection using existing GitHub credentials.

No tokens are printed or written. Run with --apply to change repository settings.
"""
import argparse
import json
import os
import subprocess
import urllib.error
import urllib.request

REPOSITORY = 'NabeelaIsham/certification_verification_system'
CHECKS = [
    'backend-lint', 'backend-test', 'backend-integration', 'backend-audit',
    'backend-production-audit', 'frontend-lint', 'frontend-test',
    'frontend-build', 'frontend-audit', 'frontend-production-audit', 'container-builds'
]


def protection_matches(actual, requested):
    checks = actual.get('required_status_checks') or {}
    reviews = actual.get('required_pull_request_reviews') or {}
    expected_reviews = requested['required_pull_request_reviews']
    return (
        checks.get('strict') is True
        and set(requested['required_status_checks']['contexts']).issubset(checks.get('contexts', []))
        and (actual.get('enforce_admins') or {}).get('enabled') is True
        and reviews.get('dismiss_stale_reviews') is True
        and reviews.get('required_approving_review_count', 0) >= expected_reviews['required_approving_review_count']
        and all(not expected_reviews[key] or reviews.get(key) is True
                for key in ('require_code_owner_reviews', 'require_last_push_approval'))
        and (actual.get('allow_force_pushes') or {}).get('enabled') is False
        and (actual.get('allow_deletions') or {}).get('enabled') is False
        and (actual.get('required_conversation_resolution') or {}).get('enabled') is True
        and (not requested['required_linear_history']
             or (actual.get('required_linear_history') or {}).get('enabled') is True)
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    token = os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if not token:
        environment = {**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GCM_INTERACTIVE': 'Never'}
        try:
            result = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, env=environment, timeout=20)
            credential = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
            token = credential.get('password')
        except subprocess.TimeoutExpired:
            pass
    if not token:
        raise SystemExit('BLOCKED: No existing GitHub administrative credential is available. Authenticate locally or supply GH_TOKEN in the environment; do not paste it into chat.')

    def api(path, payload=None):
        request = urllib.request.Request('https://api.github.com/' + path,
            data=json.dumps(payload).encode() if payload is not None else None,
            method='PUT' if payload is not None else 'GET',
            headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'Certiverxia-maintenance'})
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)

    repository = api('repos/' + REPOSITORY)
    if not repository.get('permissions', {}).get('admin'):
        raise SystemExit('BLOCKED: Existing GitHub credentials do not have repository administration permission.')
    endpoint = f'repos/{REPOSITORY}/branches/main/protection'
    try:
        existing = api(endpoint)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
        existing = {}
    # Refuse to silently replace custom restrictions; preserve them for review.
    if existing.get('restrictions') or (existing.get('required_pull_request_reviews') or {}).get('dismissal_restrictions'):
        raise SystemExit('BLOCKED: Existing custom restrictions need an explicit merge before applying this baseline.')
    reviews = existing.get('required_pull_request_reviews') or {}
    current_checks = (existing.get('required_status_checks') or {}).get('contexts', [])
    payload = {
        'required_status_checks': {'strict': True, 'contexts': sorted(set(CHECKS + current_checks))},
        'enforce_admins': True,
        'required_pull_request_reviews': {
            'dismiss_stale_reviews': True,
            'require_code_owner_reviews': reviews.get('require_code_owner_reviews', False),
            'required_approving_review_count': max(1, reviews.get('required_approving_review_count', 0)),
            'require_last_push_approval': reviews.get('require_last_push_approval', False)
        },
        'restrictions': None,
        'allow_force_pushes': False,
        'allow_deletions': False,
        'required_conversation_resolution': True,
        'required_linear_history': existing.get('required_linear_history', {}).get('enabled', False)
    }
    print(json.dumps({'repository': REPOSITORY, 'branch': 'main', 'requested_protection': payload}, indent=2))
    if args.apply:
        api(endpoint, payload)
        verified = api(endpoint)
        if not protection_matches(verified, payload):
            raise SystemExit('Protection verification failed.')
        print('Main branch protection applied and read back successfully.')


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f'GitHub rejected the request (HTTP {error.code}); no credential values were printed.')
    except urllib.error.URLError:
        raise SystemExit('GitHub could not be reached; protection was not verified.')
