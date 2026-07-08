"""Async Redis connection pool and dependency helpers."""

from redis.asyncio import ConnectionPool, Redis

from deploypilot.core.config import settings

_pool: ConnectionPool | None = None
_redis: Redis | None = None


async def get_redis() -> Redis:
    """Return a shared async Redis client, creating it on first call."""
    global _pool, _redis
    if _redis is None:
        _pool = ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
        _redis = Redis(connection_pool=_pool)
    return _redis


async def close_redis() -> None:
    """Close the Redis connection on application shutdown."""
    global _redis, _pool
    if _redis:
        await _redis.aclose()
        _redis = None
    if _pool:
        await _pool.aclose()
        _pool = None
