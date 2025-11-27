"""
Firebase Admin SDK Service
Handles Firebase authentication and Firestore operations from backend
"""

import firebase_admin
from firebase_admin import credentials, auth, firestore
from typing import Optional
import os

from config import config

# Initialize Firebase Admin SDK
_app = None
_db = None


def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global _app, _db
    
    if _app is not None:
        return _app
    
    try:
        # Check if credentials file exists
        if config.FIREBASE_CREDENTIALS_PATH and os.path.exists(config.FIREBASE_CREDENTIALS_PATH):
            cred = credentials.Certificate(config.FIREBASE_CREDENTIALS_PATH)
            _app = firebase_admin.initialize_app(cred)
        else:
            # Use default credentials (for Cloud Run, etc.)
            _app = firebase_admin.initialize_app()
        
        _db = firestore.client()
        print("Firebase Admin SDK initialized successfully")
        return _app
    except Exception as e:
        print(f"Warning: Firebase initialization failed: {str(e)}")
        print("Firebase features will not be available")
        return None


def get_firestore_client():
    """Get Firestore client"""
    global _db
    if _db is None:
        initialize_firebase()
    return _db


async def verify_token(token: str) -> Optional[dict]:
    """
    Verify Firebase ID token
    
    Args:
        token: Firebase ID token
        
    Returns:
        Decoded token with user info, or None if invalid
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {str(e)}")
        return None


async def get_user(uid: str) -> Optional[dict]:
    """
    Get user by UID
    
    Args:
        uid: User ID
        
    Returns:
        User record or None
    """
    try:
        user = auth.get_user(uid)
        return {
            "uid": user.uid,
            "email": user.email,
            "display_name": user.display_name,
            "email_verified": user.email_verified,
        }
    except Exception as e:
        print(f"Failed to get user: {str(e)}")
        return None


# Firestore helper functions

async def get_document(collection: str, document_id: str) -> Optional[dict]:
    """Get a document from Firestore"""
    try:
        db = get_firestore_client()
        if db is None:
            return None
        
        doc_ref = db.collection(collection).document(document_id)
        doc = doc_ref.get()
        
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None
    except Exception as e:
        print(f"Failed to get document: {str(e)}")
        return None


async def set_document(collection: str, document_id: str, data: dict) -> bool:
    """Set a document in Firestore"""
    try:
        db = get_firestore_client()
        if db is None:
            return False
        
        doc_ref = db.collection(collection).document(document_id)
        doc_ref.set(data)
        return True
    except Exception as e:
        print(f"Failed to set document: {str(e)}")
        return False


async def update_document(collection: str, document_id: str, data: dict) -> bool:
    """Update a document in Firestore"""
    try:
        db = get_firestore_client()
        if db is None:
            return False
        
        doc_ref = db.collection(collection).document(document_id)
        doc_ref.update(data)
        return True
    except Exception as e:
        print(f"Failed to update document: {str(e)}")
        return False


# Initialize on import
initialize_firebase()
