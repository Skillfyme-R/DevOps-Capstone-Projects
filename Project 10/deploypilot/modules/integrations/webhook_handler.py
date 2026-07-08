from deploypilot.core.logging import get_logger

log = get_logger(__name__)


class WebhookHandler:
    def __init__(self, db):
        self.db = db

    async def handle_push(self, payload: dict) -> dict:
        repo = payload.get("repository", {}).get("full_name", "unknown")
        ref = payload.get("ref", "")
        commit_sha = payload.get("after", "")
        branch = ref.replace("refs/heads/", "") if ref.startswith("refs/heads/") else ref
        log.info("github_push_received", repo=repo, branch=branch, commit_sha=commit_sha)
        return {"event": "push", "repo": repo, "branch": branch, "commit_sha": commit_sha}

    async def handle_pull_request(self, payload: dict) -> dict:
        action = payload.get("action", "")
        pr = payload.get("pull_request", {})
        pr_number = pr.get("number")
        repo = payload.get("repository", {}).get("full_name", "unknown")
        branch = pr.get("head", {}).get("ref", "")
        commit_sha = pr.get("head", {}).get("sha", "")
        log.info("github_pr_received", action=action, repo=repo, pr_number=pr_number, branch=branch)
        return {"event": "pull_request", "action": action, "repo": repo, "pr_number": pr_number, "branch": branch, "commit_sha": commit_sha}
