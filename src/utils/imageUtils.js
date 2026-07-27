export function getValidImageUrl(url) {
    if (!url) return url;

    // Convert Google Drive view links to direct image links
    // Handles: https://drive.google.com/file/d/FILE_ID/view
    const gdriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gdriveMatch && gdriveMatch[1]) {
        // Thumbnail endpoint is often more reliable for displaying in <img> without CORS/auth issues
        return `https://drive.google.com/thumbnail?id=${gdriveMatch[1]}&sz=w1000`;
    }

    // Handles: https://drive.google.com/open?id=FILE_ID
    const gdriveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (gdriveOpenMatch && gdriveOpenMatch[1]) {
        return `https://drive.google.com/thumbnail?id=${gdriveOpenMatch[1]}&sz=w1000`;
    }

    return url;
}

export function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height *= maxWidth / width));
                        width = maxWidth;
                    } else {
                        width = Math.round((width *= maxHeight / height));
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas to Blob conversion failed'));
                        return;
                    }
                    // create a new File object
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    
                    resolve({
                        file: compressedFile,
                        originalSize: file.size,
                        compressedSize: compressedFile.size
                    });
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}
