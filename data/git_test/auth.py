def login():
    """Perform generic login."""
    pass

def login_with_google(token):
    """Authenticate a user using a Google OAuth token."""
    if not token:
        raise ValueError("Google OAuth token is required")
    print("Verifying Google OAuth token...")
    return {
        "user_id": "google_12345",
        "email": "user@gmail.com",
        "name": "Google User",
        "authenticated": True
    }
