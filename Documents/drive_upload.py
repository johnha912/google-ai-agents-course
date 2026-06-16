import os
import argparse
import mimetypes
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

# Scopes required to upload files (drive.file limits access to only files created/opened by this app)
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def authenticate():
    """Authenticates the user and returns valid credentials."""
    creds = None
    
    # token.json stores access and refresh tokens created when flow completes
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
    # If there are no valid credentials, perform OAuth or fall back to default env
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None
                
        if not creds:
            if os.path.exists('credentials.json'):
                print("Performing local OAuth flow using 'credentials.json'...")
                flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
                # Save credentials
                with open('token.json', 'w') as token:
                    token.write(creds.to_json())
            else:
                print("'credentials.json' not found. Attempting Application Default Credentials (ADC)...")
                import google.auth
                try:
                    creds, _ = google.auth.default()
                except google.auth.exceptions.DefaultCredentialsError:
                    raise FileNotFoundError(
                        "Authentication failed: 'credentials.json' was not found in the root directory "
                        "and Application Default Credentials are not set in the environment.\n"
                        "To fix this, download your OAuth client credentials from the Google Cloud Console "
                        "and save them as 'credentials.json' in this folder."
                    )
    return creds

def upload_file(local_path, remote_name=None, folder_id=None, mime_type=None):
    """Uploads a file to Google Drive.
    
    Args:
        local_path (str): Path to the local file to upload.
        remote_name (str): Optional custom name for the uploaded file in Drive.
        folder_id (str): Optional parent folder ID in Drive.
        mime_type (str): Optional custom MIME type for the file.
    """
    if not os.path.exists(local_path):
        raise FileNotFoundError(f"Local file not found: {local_path}")
        
    # Set default remote name to filename if not supplied
    if not remote_name:
        remote_name = os.path.basename(local_path)
        
    # Autodetect MIME type if not supplied
    if not mime_type:
        mime_type, _ = mimetypes.guess_type(local_path)
        if not mime_type:
            mime_type = 'application/octet-stream' # Fallback binary type
            
    print(f"Preparing to upload: '{local_path}' -> '{remote_name}' ({mime_type})")
    
    try:
        creds = authenticate()
        service = build('drive', 'v3', credentials=creds)
        
        # Define file metadata
        file_metadata = {'name': remote_name}
        if folder_id:
            file_metadata['parents'] = [folder_id]
            
        # Define media content
        media = MediaFileUpload(local_path, mimetype=mime_type, resumable=True)
        
        # Execute the upload request
        print("Uploading file to Google Drive...")
        file_record = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()
        
        file_id = file_record.get('id')
        web_link = file_record.get('webViewLink')
        
        print("\nUpload Successful!")
        print(f"  File ID: {file_id}")
        print(f"  Web Link: {web_link}")
        return file_id, web_link
        
    except HttpError as error:
        print(f"An API error occurred: {error}")
        return None, None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None, None

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Upload a local file to Google Drive.")
    parser.add_argument('--file', required=True, help="Path to the local file to upload.")
    parser.add_argument('--name', help="Custom name for the file in Google Drive.")
    parser.add_argument('--folder', help="Google Drive folder ID to upload the file into.")
    parser.add_argument('--mime', help="Mime type override (e.g. image/png).")
    
    args = parser.parse_args()
    upload_file(args.file, args.name, args.folder, args.mime)
