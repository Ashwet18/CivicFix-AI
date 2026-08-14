"""
File Service - Secure image upload, validation, and storage
Handles file validation, unique naming, and secure serving
"""
import os
import uuid
import hashlib
from pathlib import Path
from typing import Optional, Tuple, List
from fastapi import UploadFile, HTTPException
from PIL import Image
import mimetypes


class FileService:
    """
    Handles secure file upload, validation, and storage for civic issue images.
    """
    
    def __init__(self, upload_base_dir: str = "uploads"):
        """
        Initialize file service.
        
        Args:
            upload_base_dir: Base directory for uploads (relative to backend root)
        """
        self.upload_base_dir = Path(upload_base_dir)
        self.issues_dir = self.upload_base_dir / "issues"
        
        # Allowed file types
        self.allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        self.allowed_mime_types = {
            "image/jpeg",
            "image/jpg", 
            "image/png",
            "image/webp"
        }
        
        # File size limits
        self.max_file_size = 5 * 1024 * 1024  # 5 MB
        self.max_image_dimension = 4000  # Max width or height in pixels
        
        # Create directories
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Create upload directories if they don't exist."""
        self.issues_dir.mkdir(parents=True, exist_ok=True)
        
        # Create .gitignore to exclude uploaded files from git
        gitignore_path = self.upload_base_dir / ".gitignore"
        if not gitignore_path.exists():
            gitignore_path.write_text("# Exclude all uploaded files\n*\n!.gitignore\n")
    
    async def validate_and_save_issue_image(
        self, 
        file: UploadFile,
        issue_id: Optional[int] = None
    ) -> Tuple[str, str]:
        """
        Validate and save an uploaded issue image.
        
        Args:
            file: Uploaded file from FastAPI
            issue_id: Optional issue ID for filename (if None, uses temp naming)
            
        Returns:
            Tuple of (full_path, relative_path)
            
        Raises:
            HTTPException: If validation fails
        """
        # Validate file
        await self._validate_upload_file(file)
        
        # Generate secure filename
        filename = self._generate_secure_filename(file.filename, issue_id)
        full_path = self.issues_dir / filename
        
        # Save file
        try:
            content = await file.read()
            
            # Additional validation: try to open as image
            await self._validate_image_content(content)
            
            # Save to disk
            with open(full_path, "wb") as f:
                f.write(content)
                
        except Exception as e:
            # Clean up partial file if it exists
            if full_path.exists():
                full_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=f"Failed to save image: {str(e)}"
            )
        
        # Return paths
        relative_path = f"uploads/issues/{filename}"
        return str(full_path), relative_path
    
    async def _validate_upload_file(self, file: UploadFile):
        """
        Validate uploaded file meets requirements.
        
        Args:
            file: Uploaded file
            
        Raises:
            HTTPException: If validation fails
        """
        # Check if file is provided
        if not file or not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file provided"
            )
        
        # Validate file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in self.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(self.allowed_extensions)}"
            )
        
        # Validate MIME type
        if file.content_type not in self.allowed_mime_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid content type: {file.content_type}"
            )
        
        # Check file size
        if hasattr(file.file, 'seek'):
            file.file.seek(0, 2)  # Seek to end
            file_size = file.file.tell()
            file.file.seek(0)  # Reset to beginning
            
            if file_size > self.max_file_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size: {self.max_file_size // (1024*1024)} MB"
                )
    
    async def _validate_image_content(self, content: bytes):
        """
        Validate image content using PIL.
        
        Args:
            content: File content bytes
            
        Raises:
            HTTPException: If image validation fails
        """
        try:
            # Try to open and validate the image
            image = Image.open(io.BytesIO(content))
            
            # Verify it's a valid image
            image.verify()
            
            # Check dimensions
            width, height = image.size
            if width > self.max_image_dimension or height > self.max_image_dimension:
                raise HTTPException(
                    status_code=400,
                    detail=f"Image too large. Maximum dimension: {self.max_image_dimension}px"
                )
                
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(
                status_code=400,
                detail="Invalid image file or corrupted image"
            )
    
    def _generate_secure_filename(self, original_filename: str, issue_id: Optional[int] = None) -> str:
        """
        Generate a secure, unique filename.
        
        Args:
            original_filename: Original uploaded filename
            issue_id: Optional issue ID
            
        Returns:
            Secure filename
        """
        # Get file extension
        file_ext = Path(original_filename).suffix.lower()
        
        # Generate unique identifier
        unique_id = str(uuid.uuid4())
        
        # Create filename: {prefix}_{uuid}.{ext}
        if issue_id:
            prefix = f"issue_{issue_id}"
        else:
            prefix = "temp"
            
        return f"{prefix}_{unique_id}{file_ext}"
    
    def delete_file(self, file_path: str) -> bool:
        """
        Safely delete a file.
        
        Args:
            file_path: Path to file (relative or absolute)
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            # Convert to Path object
            if not Path(file_path).is_absolute():
                full_path = Path(file_path)
            else:
                full_path = Path(file_path)
            
            # Security check: ensure file is within upload directory
            if not self._is_safe_path(full_path):
                return False
            
            if full_path.exists() and full_path.is_file():
                full_path.unlink()
                return True
                
        except Exception:
            pass
        
        return False
    
    def _is_safe_path(self, file_path: Path) -> bool:
        """
        Check if file path is safe (within upload directory).
        Prevents path traversal attacks.
        
        Args:
            file_path: Path to check
            
        Returns:
            True if path is safe
        """
        try:
            # Resolve absolute paths
            upload_abs = self.upload_base_dir.resolve()
            file_abs = file_path.resolve()
            
            # Check if file is within upload directory
            return str(file_abs).startswith(str(upload_abs))
            
        except Exception:
            return False
    
    def get_file_info(self, file_path: str) -> Optional[dict]:
        """
        Get information about a stored file.
        
        Args:
            file_path: Path to file
            
        Returns:
            Dictionary with file info or None if file doesn't exist
        """
        try:
            full_path = Path(file_path)
            
            if not full_path.exists():
                return None
            
            stat = full_path.stat()
            
            return {
                "filename": full_path.name,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created_at": stat.st_ctime,
                "modified_at": stat.st_mtime,
                "mime_type": mimetypes.guess_type(str(full_path))[0]
            }
            
        except Exception:
            return None


import io