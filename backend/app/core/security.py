import hashlib
import secrets

HASH_ALGORITHM = "pbkdf2_sha256"
HASH_ITERATIONS = 390_000
LEGACY_ITERATIONS = 160_000


def _digest(password, salt, iterations):
    return hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    ).hex()


def hash_password(password, salt=None, iterations=HASH_ITERATIONS):
    salt = salt or secrets.token_hex(16)
    digest = _digest(password, salt, iterations)
    return f"{HASH_ALGORITHM}${iterations}${salt}${digest}"


def verify_password(password, stored):
    if not stored:
        return False

    try:
        algorithm, iterations, salt, digest = stored.split("$", 3)
    except ValueError:
        return verify_legacy_password(password, stored)

    if algorithm != HASH_ALGORITHM:
        return False

    try:
        iterations = int(iterations)
    except ValueError:
        return False

    candidate = _digest(password, salt, iterations)
    return secrets.compare_digest(candidate, digest)


def verify_legacy_password(password, stored):
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False

    candidate = _digest(password, salt, LEGACY_ITERATIONS)
    return secrets.compare_digest(candidate, digest)


def new_token():
    return secrets.token_urlsafe(32)
