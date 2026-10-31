import time
from collections import defaultdict
from typing import Dict, List

class RateLimiter:
    """
    In-memory rate limiter using sliding window per reporter_hash and ip_hash.
    Ensures single actors / bots cannot flood the endpoint.
    """
    def __init__(self, window_seconds: int = 3600, max_requests: int = 30):
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self.reporter_history: Dict[str, List[float]] = defaultdict(list)
        self.ip_history: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, reporter_hash: str, ip_hash: str) -> bool:
        now = time.time()
        cutoff = now - self.window_seconds

        # Clean old timestamps
        rep_times = [t for t in self.reporter_history[reporter_hash] if t > cutoff]
        self.reporter_history[reporter_hash] = rep_times

        ip_times = [t for t in self.ip_history[ip_hash] if t > cutoff]
        self.ip_history[ip_hash] = ip_times

        # Check reporter limit
        if len(rep_times) >= self.max_requests:
            return True

        # Check IP limit (allowing e.g. up to 60 per IP across reporters)
        if len(ip_times) >= (self.max_requests * 2):
            return True

        # Record this request
        self.reporter_history[reporter_hash].append(now)
        self.ip_history[ip_hash].append(now)
        return False

    def reset(self):
        self.reporter_history.clear()
        self.ip_history.clear()

rate_limiter = RateLimiter()

