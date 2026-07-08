"""
Sliding-window rate limiter backed by Redis.
Applied as a FastAPI middleware (or per-route dependency).
"""
import time
from typing import Annotated

from fastapi import Depends, Request
from redis.asyncio import Redis

from deploypilot.common.exceptions.http import RateLimitError
from deploypilot.core.config import settings
from deploypilot.core.redis import get_redis


async def rate_limit(request: Request, redis: Redis = Depends(get_redis)) -> None:
    """
    Per-IP sliding window: RATE_LIMIT_REQUESTS requests per RATE_LIMIT_WINDOW_SECONDS.
    Uses a sorted set keyed by remote IP — each entry is timestamped.
    """
    ip = request.client.host if request.client else "unknown"
    key = f"ratelimit:{ip}"
    now = time.time()
    window_start = now - settings.RATE_LIMIT_WINDOW_SECONDS

    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, settings.RATE_LIMIT_WINDOW_SECONDS)
    results = await pipe.execute()

    request_count = results[2]
    if request_count > settings.RATE_LIMIT_REQUESTS:
        raise RateLimitError(
            f"Rate limit exceeded: {settings.RATE_LIMIT_REQUESTS} requests "
            f"per {settings.RATE_LIMIT_WINDOW_SECONDS}s"
        )


RateLimited = Depends(rate_limit)
